## ADDED Requirements

### Requirement: Next.js Image 最佳化設定

系統 SHALL 在 `next.config.ts` 設定 `images.remotePatterns`，允許 next/image 處理 S3 與 CloudFront 來源圖片。

#### Scenario: CloudFront 圖片通過 next/image

- **WHEN** `CLOUDFRONT_URL` env var 已設定，`<Image>` 元件使用 CloudFront URL
- **THEN** next/image 接受該 hostname，並提供 WebP 自動轉換與 size negotiation

#### Scenario: 直接 S3 URL 通過 next/image

- **WHEN** `CLOUDFRONT_URL` 未設定，`<Image>` 元件使用 S3 直連 URL
- **THEN** next/image 接受 `{bucket}.s3.{region}.amazonaws.com` hostname

#### Scenario: 未設定 remotePatterns 的 hostname 被拒絕

- **WHEN** `<Image>` 元件使用未在 remotePatterns 內的 hostname
- **THEN** next/image 拋出設定錯誤，防止未預期的外部圖片流量

### Requirement: 全站圖片改用 next/image

系統 SHALL 在所有顯示 S3/CloudFront 圖片的元件中使用 `<Image>`（next/image），替代原生 `<img>` 標籤。

#### Scenario: Dashboard 書本封面顯示最佳化圖片

- **WHEN** Dashboard 載入書本列表
- **THEN** 封面圖透過 next/image 以 WebP 格式傳輸，並依容器尺寸自動選擇適合的 size

#### Scenario: Carousel 圖片使用 next/image

- **WHEN** 讀者瀏覽含照片的頁面
- **THEN** Carousel 照片透過 next/image 呈現，支援 blur placeholder 載入體驗

#### Scenario: 封面選擇器縮圖使用 next/image

- **WHEN** Creator 開啟封面圖選擇器（CoverImageButton）
- **THEN** 候選縮圖以 next/image 顯示

#### Scenario: 上傳預覽縮圖使用 next/image

- **WHEN** 使用者在 MediaUploader 上傳圖片後顯示預覽
- **THEN** 預覽縮圖以 next/image 顯示
