import './globals.css'

export const metadata = {
  title: 'Tailwind CSS 4 + Next.js Playground',
  description: '基于 Next.js 的 Tailwind CSS 4.x 学习环境',
}

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body className="antialiased bg-slate-950 text-slate-100">{children}</body>
    </html>
  )
}
