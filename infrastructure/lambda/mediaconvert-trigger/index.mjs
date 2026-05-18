import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3'
import { MediaConvertClient, CreateJobCommand } from '@aws-sdk/client-mediaconvert'

const REGION = process.env.AWS_REGION ?? 'ap-northeast-1'
const BUCKET = process.env.S3_BUCKET_NAME
const MEDIACONVERT_ENDPOINT = process.env.MEDIACONVERT_ENDPOINT
const ROLE_ARN = process.env.MEDIACONVERT_ROLE_ARN

const s3 = new S3Client({ region: REGION })
const mediaConvert = new MediaConvertClient({ region: REGION, endpoint: MEDIACONVERT_ENDPOINT })

export const handler = async (event) => {
  const record = event.Records[0].s3
  const bucket = record.bucket.name
  const key = decodeURIComponent(record.object.key.replace(/\+/g, ' '))

  // Only process direct video-raw uploads: books/{bookId}/pages/{pageId}/video-raw.{ext}
  // Excludes HLS output paths like .../hls/video-raw.m3u8
  const match = key.match(/^books\/([^/]+)\/pages\/([^/]+)\/video-raw\./)
  if (!match) {
    console.log('Skipping non-video-raw key:', key)
    return
  }
  const [, bookId, pageId] = match
  const folder = `books/${bookId}/pages/${pageId}`

  // Idempotency: skip if HLS already exists
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: `${folder}/hls/index.m3u8` }))
    console.log('HLS already exists, skipping job creation')
    return
  } catch {
    // Does not exist — proceed
  }

  const inputFile = `s3://${bucket}/${key}`
  const outputPath = `s3://${bucket}/${folder}/hls/`

  const jobParams = {
    Role: ROLE_ARN,
    Settings: {
      TimecodeConfig: { Source: 'ZEROBASED' },
      Inputs: [
        {
          FileInput: inputFile,
          TimecodeSource: 'ZEROBASED',
          AudioSelectors: { 'Audio Selector 1': { DefaultSelection: 'DEFAULT' } },
          VideoSelector: {},
        },
      ],
      OutputGroups: [
        {
          Name: 'HLS Group',
          OutputGroupSettings: {
            Type: 'HLS_GROUP_SETTINGS',
            HlsGroupSettings: {
              Destination: outputPath,
              SegmentLength: 6,
              MinSegmentLength: 2,
              DirectoryStructure: 'SINGLE_DIRECTORY',
              ManifestDurationFormat: 'INTEGER',
              OutputSelection: 'MANIFESTS_AND_SEGMENTS',
              StreamInfResolution: 'INCLUDE',
              ClientCache: 'ENABLED',
              CaptionLanguageSetting: 'OMIT',
              CodecSpecification: 'RFC_4281',
            },
          },
          Outputs: [
            {
              VideoDescription: {
                Width: 1280,
                Height: 720,
                CodecSettings: {
                  Codec: 'H_264',
                  H264Settings: {
                    RateControlMode: 'QVBR',
                    SceneChangeDetect: 'TRANSITION_DETECTION',
                    MaxBitrate: 3000000,
                    QualityTuningLevel: 'SINGLE_PASS',
                  },
                },
              },
              AudioDescriptions: [
                {
                  AudioSourceName: 'Audio Selector 1',
                  CodecSettings: {
                    Codec: 'AAC',
                    AacSettings: { Bitrate: 96000, CodingMode: 'CODING_MODE_2_0', SampleRate: 48000 },
                  },
                },
              ],
              ContainerSettings: { Container: 'M3U8' },
              NameModifier: '-720p',
            },
          ],
        },
      ],
    },
    UserMetadata: { bookId, pageId, SourceKey: key },
  }

  const result = await mediaConvert.send(new CreateJobCommand(jobParams))
  console.log('MediaConvert Job Created:', result.Job.Id)
}
