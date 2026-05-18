'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import useEmblaCarousel from 'embla-carousel-react'
import Lightbox from 'yet-another-react-lightbox'
import 'yet-another-react-lightbox/styles.css'
import type { EmblaCarouselType } from 'embla-carousel'

type Props = { urls: string[] }

export function Carousel({ urls }: Props) {
  const [emblaRef, emblaApi] = useEmblaCarousel()
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  const syncState = useCallback((api: EmblaCarouselType) => {
    setSelectedIndex(api.selectedScrollSnap())
    setCanPrev(api.canScrollPrev())
    setCanNext(api.canScrollNext())
  }, [])

  useEffect(() => {
    if (!emblaApi) return
    syncState(emblaApi)
    emblaApi.on('select', syncState)
    emblaApi.on('reInit', syncState)
    return () => {
      emblaApi.off('select', syncState)
      emblaApi.off('reInit', syncState)
    }
  }, [emblaApi, syncState])

  if (urls.length === 0) return null

  return (
    <>
      {/* Polaroid-style container: white bg, padding heavier at bottom */}
      <div
        className="w-full bg-white shadow-[0_4px_24px_rgba(44,24,16,0.10)]"
        style={{ padding: '12px 12px 28px' }}
      >
        {/* Embla viewport */}
        <div className="relative">
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex touch-pan-y">
              {urls.map((url, i) => (
                <div key={i} className="flex-none w-full">
                  <div
                    className="relative w-full"
                    style={{ paddingBottom: '75%', background: '#FAF7F2' }}
                  >
                    <ImgSlide
                      src={url}
                      onClick={() => { setLightboxIndex(i); setLightboxOpen(true) }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Desktop prev/next arrows */}
          {urls.length > 1 && (
            <>
              {canPrev && (
                <button
                  onClick={() => emblaApi?.scrollPrev()}
                  className="absolute left-2 top-1/2 -translate-y-1/2 hidden md:flex h-8 w-8 items-center justify-center rounded-full bg-white/85 hover:bg-white shadow text-[#2C1810] text-xl leading-none"
                >
                  ‹
                </button>
              )}
              {canNext && (
                <button
                  onClick={() => emblaApi?.scrollNext()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 hidden md:flex h-8 w-8 items-center justify-center rounded-full bg-white/85 hover:bg-white shadow text-[#2C1810] text-xl leading-none"
                >
                  ›
                </button>
              )}
            </>
          )}
        </div>

        {/* Dot indicators */}
        {urls.length > 1 && (
          <div className="mt-3 flex justify-center gap-1.5">
            {urls.map((_, i) => (
              <button
                key={i}
                onClick={() => emblaApi?.scrollTo(i)}
                className={`h-1.5 rounded-full transition-all ${
                  i === selectedIndex ? 'w-4 bg-[#2C1810]/55' : 'w-1.5 bg-[#2C1810]/20'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        index={lightboxIndex}
        slides={urls.map((src) => ({ src }))}
      />
    </>
  )
}

function ImgSlide({ src, onClick }: { src: string; onClick: () => void }) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading')

  return (
    <>
      {status === 'loading' && (
        <div className="absolute inset-0 animate-pulse bg-[#2C1810]/5" />
      )}
      {status === 'error' ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[#2C1810]/5">
          <BrokenImageIcon />
        </div>
      ) : (
        <Image
          src={src}
          alt=""
          fill
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
          onClick={onClick}
          className={`cursor-zoom-in object-contain transition-opacity duration-300 ${
            status === 'loaded' ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </>
  )
}

function BrokenImageIcon() {
  return (
    <svg
      className="h-10 w-10 text-[#2C1810]/20"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  )
}
