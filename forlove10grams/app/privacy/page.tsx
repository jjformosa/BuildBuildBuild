import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'

export const metadata: Metadata = {
  title: '隱私權政策 | Film Diary',
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#FAF7F2] py-16 px-6">
      <article className="mx-auto max-w-2xl text-[#2C1810]">
        <Link
          href="/login"
          className="text-sm text-[#2C1810]/50 hover:text-[#2C1810] transition-colors mb-8 inline-block"
        >
          ← 返回
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <Image src="/logo.png" alt="For Love 10 Grams" width={40} height={40} />
          <h1 className="text-2xl font-semibold tracking-tight">隱私權政策</h1>
        </div>
        <p className="text-sm text-[#2C1810]/50 mb-10">最後更新：2026 年 5 月</p>

        <p className="text-sm leading-relaxed mb-10 text-[#2C1810]/80">
          Film Diary（以下簡稱「本服務」）是一個私人記憶書工具，供管理者與受邀朋友共同使用。
          本政策說明我們如何蒐集、使用及保護您的個人資料。
        </p>

        <Section title="一、我們蒐集哪些資料">
          <Subsection title="1.1 登入時自動取得">
            <p>當您透過 Google 或 LINE 登入時，我們會取得：</p>
            <ul>
              <li>您的顯示名稱</li>
              <li>電子郵件地址</li>
              <li>大頭照網址</li>
            </ul>
            <p>這些資料由您的帳號提供者（Google / LINE）傳送，本服務不會向您索取密碼。</p>
          </Subsection>

          <Subsection title="1.2 您主動提供的資料">
            <ul>
              <li><strong>暱稱</strong>：您在本服務中設定的顯示名稱</li>
              <li><strong>記憶書內容</strong>：標題、描述、封面圖、頁面文字</li>
              <li><strong>媒體檔案</strong>：您上傳的圖片與影片</li>
            </ul>
          </Subsection>

          <Subsection title="1.3 系統自動記錄">
            <ul>
              <li><strong>閱讀進度</strong>：您最後閱讀到哪一頁、閱讀時間，用於下次自動跳轉</li>
              <li><strong>登入 Session</strong>：保持您的登入狀態，存放於 HTTP-only Cookie，預設有效期為 30 天</li>
            </ul>
          </Subsection>
        </Section>

        <Section title="二、資料如何使用">
          <table>
            <thead>
              <tr>
                <th>資料</th>
                <th>用途</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>姓名、大頭照</td><td>在介面中顯示您的身份</td></tr>
              <tr><td>Email</td><td>帳號識別、邀請功能</td></tr>
              <tr><td>記憶書與媒體</td><td>呈現您建立或被邀請閱讀的內容</td></tr>
              <tr><td>閱讀進度</td><td>記錄閱讀位置，下次繼續</td></tr>
              <tr><td>Session</td><td>維持登入狀態，避免重複驗證</td></tr>
            </tbody>
          </table>
          <p className="mt-4"><strong>我們不會</strong>：</p>
          <ul>
            <li>將您的資料出售或提供給廣告商</li>
            <li>用您的內容訓練 AI 模型</li>
            <li>在未獲授權下分享您的個人資料給第三方</li>
          </ul>
        </Section>

        <Section title="三、資料分享與公開">
          <p>
            本服務的內容預設為<strong>私人</strong>，僅管理者與被邀請的成員可存取。
          </p>
          <p>
            若管理者啟用「分享連結」功能，持有連結的任何人可透過瀏覽器閱讀該記憶書，無需登入。
            停用分享連結後，公開存取隨即失效。
          </p>
        </Section>

        <Section title="四、資料存放位置">
          <table>
            <thead>
              <tr>
                <th>服務</th>
                <th>用途</th>
                <th>存放地點</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>MongoDB Atlas</td><td>帳號資料、書籍資訊、閱讀記錄</td><td>雲端資料庫（加密存儲）</td></tr>
              <tr><td>AWS S3（東京區域）</td><td>圖片與影片媒體檔案</td><td>日本東京資料中心</td></tr>
              <tr><td>AWS CloudFront</td><td>媒體 CDN 加速</td><td>全球邊緣節點</td></tr>
            </tbody>
          </table>
        </Section>

        <Section title="五、第三方登入服務">
          <table>
            <thead>
              <tr>
                <th>服務</th>
                <th>用途</th>
                <th>隱私政策</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Google</td>
                <td>OAuth 登入</td>
                <td>
                  <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
                    policies.google.com/privacy
                  </a>
                </td>
              </tr>
              <tr>
                <td>LINE</td>
                <td>OAuth 登入</td>
                <td>
                  <a href="https://line.me/zh-hant/terms/policy/" target="_blank" rel="noopener noreferrer">
                    line.me/zh-hant/terms/policy
                  </a>
                </td>
              </tr>
            </tbody>
          </table>
          <p>本服務僅取得您在登入時同意授權的基本資料，不會讀取您的 Google 或 LINE 通訊內容。</p>
        </Section>

        <Section title="六、Cookie 使用說明">
          <p>
            本服務使用 <strong>HTTP-only Session Cookie</strong>（名稱：<code>authjs.session-token</code>）維持登入狀態。此 Cookie：
          </p>
          <ul>
            <li>無法被 JavaScript 讀取（HTTP-only）</li>
            <li>僅在 HTTPS 連線中傳輸（Secure）</li>
            <li>30 天後自動過期，或登出後立即失效</li>
          </ul>
          <p>本服務<strong>不使用</strong>廣告 Cookie 或第三方追蹤 Cookie。</p>
        </Section>

        <Section title="七、資料保留期限">
          <table>
            <thead>
              <tr>
                <th>資料類型</th>
                <th>保留期限</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Session</td><td>30 天，或登出時刪除</td></tr>
              <tr><td>帳號資料</td><td>帳號存續期間</td></tr>
              <tr><td>記憶書與媒體</td><td>存續至管理者刪除</td></tr>
              <tr><td>閱讀進度</td><td>存續至帳號刪除</td></tr>
            </tbody>
          </table>
        </Section>

        <Section title="八、您的權利">
          <p>您可以：</p>
          <ul>
            <li>要求查閱本服務儲存您的哪些資料</li>
            <li>要求更正不正確的資料</li>
            <li>要求刪除您的帳號與相關資料</li>
          </ul>
          <p>如需行使上述權利，請透過下方聯絡方式與我們聯繫。</p>
        </Section>

        <Section title="九、聯絡方式">
          <p>若您對本隱私權政策有任何疑問，請聯絡：</p>
          <p>
            <strong>Email</strong>：
            <a href="mailto:jjformosa1220@gmail.com">jjformosa1220@gmail.com</a>
          </p>
        </Section>

        <p className="text-xs text-[#2C1810]/40 mt-12 border-t border-[#2C1810]/10 pt-6">
          本政策若有重大異動，將於本頁面更新內容並標示日期。
        </p>
      </article>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-base font-semibold mb-4 pb-2 border-b border-[#2C1810]/10">{title}</h2>
      <div className="text-sm leading-relaxed text-[#2C1810]/80 space-y-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_table]:w-full [&_table]:text-left [&_th]:font-medium [&_th]:text-[#2C1810] [&_th]:py-2 [&_td]:py-2 [&_td]:border-t [&_td]:border-[#2C1810]/10 [&_a]:underline [&_a]:underline-offset-2 [&_code]:bg-[#2C1810]/5 [&_code]:px-1 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono">
        {children}
      </div>
    </section>
  )
}

function Subsection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h3 className="font-medium text-[#2C1810] mb-2">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  )
}
