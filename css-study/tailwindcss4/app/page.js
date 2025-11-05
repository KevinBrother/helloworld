const navigation = [
  { name: '特性', href: '#features' },
  { name: '工作流程', href: '#workflow' },
  { name: '演示', href: '#preview' },
  { name: '常见问题', href: '#faq' },
]

const features = [
  {
    title: '原子化设计系统',
    description: '借助 @theme、语义令牌与 CSS 变量，将设计语言层层透传到组件，实现毫不费力的全局一致性。',
  },
  {
    title: '极速开发体验',
    description: 'Tailwind 4 自带零配置的 PostCSS 管线与原生 JIT，编写类名即可实时看到效果。',
  },
  {
    title: 'React Server 组件',
    description: 'App Router 默认启用服务端组件，自动代码拆分、Streaming 与缓存策略都一网打尽。',
  },
  {
    title: '暗黑风体验',
    description: '基于 Slate 色阶的暗色 UI，配合透明玻璃拟态与柔和发光，轻松打造现代界面。',
  },
]

const workflow = [
  '定义主题令牌，快速建立品牌色与排印系统。',
  '使用 Server Actions 连接后端，保持界面响应灵敏。',
  '利用 React hook 与 Tailwind 原子类组合组件状态。',
  '通过 Vercel 或 Docker 部署，一键上线生产环境。',
]

const highlights = [
  { label: 'Tailwind 4 Ready', value: 'Beta', note: '无需配置文件，直接使用新语法。' },
  { label: 'Next.js 14 App Router', value: '全面启用', note: '并发渲染 + Streaming。' },
  { label: '设计令牌', value: '12+', note: '颜色、圆角、间距一处定义。' },
]

const faqs = [
  {
    question: '我可以在项目里使用现有组件库吗？',
    answer:
      '可以。Tailwind 与任何 React 组件库兼容。如果组件库支持 CSS 变量，还能直接复用 @theme 中定义的设计令牌。',
  },
  {
    question: '如何扩展 Tailwind 的默认设计系统？',
    answer:
      '在 `app/globals.css` 中使用 @theme 添加自定义颜色、字体或阴影，然后在类名中通过语义引用即可。',
  },
  {
    question: '项目支持多语言吗？',
    answer:
      'Next.js 内置 i18n 功能。你可以结合 App Router 的 layout 段路由，在服务端静态或动态提供多语言内容。',
  },
]

export default function HomePage() {
  return (
    <main className="relative overflow-hidden">
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_center,_rgba(14,165,233,0.16),_transparent_65%)] opacity-80" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(120deg,_rgba(10,37,64,0.9)_0%,_rgba(15,23,42,0.95)_35%,_rgba(8,47,73,0.85)_100%)]" />

      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-24 px-6 pb-24 pt-10 sm:pt-12 lg:px-10">
        <header className="rounded-3xl border border-white/5 bg-white/3 px-6 py-5 backdrop-blur supports-[backdrop-filter]:bg-white/4 sm:px-8">
          <nav className="flex flex-wrap items-center justify-between gap-4 text-sm text-slate-200">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-cyan-400/40 bg-cyan-400/15 text-lg font-semibold text-cyan-300">
                tw.
              </span>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-white">Tailwind Next Starter</span>
                <span className="text-xs text-slate-400">用设计令牌塑造界面系统</span>
              </div>
            </div>

            <div className="hidden items-center gap-8 md:flex">
              {navigation.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="font-medium tracking-wide text-slate-300 transition hover:text-white"
                >
                  {item.name}
                </a>
              ))}
            </div>

            <a
              className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-500/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200 transition hover:border-cyan-300/60 hover:bg-cyan-400/20"
              href="https://tailwindcss.com/blog/tailwindcss-v4-alpha"
              target="_blank"
              rel="noreferrer"
            >
              Tailwind 4 预览
            </a>
          </nav>
        </header>

        <section className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-8">
            <span className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-slate-900/50 px-4 py-1 text-xs font-medium text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
              Next.js App Router · Tailwind CSS 4.x
            </span>
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              打造下一代设计系统驱动的现代界面
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
              借助 Next.js 的服务端渲染能力与 Tailwind 4 全新的原子化工作流，我们可以在数小时内完成设计系统搭建、组件开发与上线。
              这个模板帮助你迅速验证想法、建立一致的品牌体验。
            </p>
            <div className="flex flex-wrap items-center gap-6">
              <a
                className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-cyan-400/40 transition hover:bg-cyan-300"
                href="#preview"
              >
                查看界面演示
              </a>
              <a
                className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-200 transition hover:text-cyan-100"
                href="https://nextjs.org/docs"
                target="_blank"
                rel="noreferrer"
              >
                阅读 Next.js 文档 →
              </a>
            </div>

            <dl className="grid gap-6 sm:grid-cols-3">
              {highlights.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-white/5 bg-white/5 p-4 text-sm text-slate-300 shadow-[0_10px_40px_rgba(15,23,42,0.35)]"
                >
                  <dt className="text-xs uppercase tracking-[0.28em] text-slate-400">{item.label}</dt>
                  <dd className="mt-2 text-2xl font-semibold text-white">{item.value}</dd>
                  <p className="mt-1 text-xs text-slate-400">{item.note}</p>
                </div>
              ))}
            </dl>
          </div>

          <div
            id="preview"
            className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-slate-900/60 p-8 shadow-[0_20px_80px_rgba(15,23,42,0.45)]"
          >
            <div className="absolute -right-24 -top-20 h-64 w-64 rounded-full bg-cyan-400/30 blur-3xl" />
            <div className="absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-slate-500/30 blur-3xl" />
            <div className="relative space-y-6">
              <h2 className="text-sm font-semibold uppercase tracking-[0.32em] text-cyan-200">界面预览</h2>
              <div className="rounded-2xl border border-white/10 bg-slate-950/80 p-6">
                <div className="mb-4 flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-rose-400" />
                  <span className="h-2 w-2 rounded-full bg-amber-300" />
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                </div>
                <div className="space-y-5 text-sm text-slate-300">
                  <p className="text-base font-semibold text-white">组合 Tailwind 原子类，构建响应式布局</p>
                  <p>
                    <code className="rounded bg-slate-900 px-2 py-1 text-xs text-cyan-200">flex</code>
                    <code className="ml-2 rounded bg-slate-900 px-2 py-1 text-xs text-cyan-200">grid</code>
                    <code className="ml-2 rounded bg-slate-900 px-2 py-1 text-xs text-cyan-200">backdrop-blur</code>
                    等类名可以自由搭配，快速得到卓越的视觉层次。
                  </p>
                  <div className="rounded-xl border border-cyan-300/30 bg-cyan-400/10 p-4 text-xs">
                    <pre className="overflow-x-auto text-[0.8rem] leading-relaxed text-cyan-100">
{`<section className="grid gap-6 lg:grid-cols-2">
  <div className="rounded-3xl bg-slate-950/70 p-8">
    <h3 className="text-lg font-semibold text-white">Tailwind Utility</h3>
    <p className="text-slate-300">更快的原型验证、更可靠的设计一致性。</p>
  </div>
  <div className="rounded-3xl bg-slate-950/70 p-8">
    <h3 className="text-lg font-semibold text-white">Next.js 14</h3>
    <p className="text-slate-300">Streaming、动态渲染任你调度。</p>
  </div>
</section>`}
                    </pre>
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-400">
                演示中的组件采用纯 Tailwind 原子类。你也可以替换为任何 React UI 库，保留布局与配色逻辑即可。
              </p>
            </div>
          </div>
        </section>

        <section id="features" className="space-y-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-400">核心特性</p>
              <h2 className="mt-2 text-3xl font-semibold text-white">从设计到开发，一条龙协同</h2>
            </div>
            <p className="max-w-2xl text-sm text-slate-300">
              通过 Tailwind 4 与 Next.js 的组合，设计师与工程师可以共享原子化语言。组件的语义命名与设计令牌一一对应，
              快速构建并维护大规模前端系统。
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group relative overflow-hidden rounded-3xl border border-white/5 bg-white/[0.08] p-8 transition hover:border-cyan-400/40 hover:bg-cyan-400/10"
              >
                <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-cyan-400/20 blur-3xl transition group-hover:bg-cyan-300/30" />
                <h3 className="text-xl font-semibold text-white">{feature.title}</h3>
                <p className="mt-4 text-sm leading-6 text-slate-200">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="workflow" className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div className="rounded-3xl border border-white/5 bg-slate-900/70 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.45)]">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-400">工作流程</p>
            <h2 className="mt-4 text-3xl font-semibold text-white">从设计稿到上线只需要四个阶段</h2>
            <ul className="mt-6 space-y-4 text-sm text-slate-300">
              {workflow.map((item, index) => (
                <li key={item} className="flex gap-4">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full border border-cyan-400/40 bg-cyan-400/10 text-sm font-semibold text-cyan-200">
                    {index + 1}
                  </span>
                  <span className="leading-[1.65]">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="relative overflow-hidden rounded-3xl border border-cyan-400/30 bg-cyan-400/10 p-8">
              <div className="absolute -right-16 top-12 h-32 w-32 rounded-full bg-cyan-300/40 blur-3xl" />
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-100">Live Coding</p>
              <h3 className="mt-4 text-lg font-semibold text-slate-950">Tailwind 原子类</h3>
              <p className="mt-3 text-sm text-slate-900/80">
                Tailwind 4 支持任意 CSS 属性作为原子类，配合 VS Code 插件自动补全，大幅提升效率。
              </p>
            </div>
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/10 p-8">
              <div className="absolute -left-16 bottom-10 h-28 w-28 rounded-full bg-white/20 blur-3xl" />
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-200">Server Actions</p>
              <h3 className="mt-4 text-lg font-semibold text-white">Next.js 14</h3>
              <p className="mt-3 text-sm text-slate-300">
                减少客户端 JavaScript 体积，轻松实现延迟加载、边缘渲染与缓存失效策略。
              </p>
            </div>
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70 p-8 md:col-span-2">
              <div className="absolute inset-0 bg-[conic-gradient(from_130deg,_rgba(6,182,212,0.08),_transparent_65%)]" />
              <div className="relative flex flex-col gap-4">
                <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-400">团队协作</p>
                <h3 className="text-lg font-semibold text-white">Storybook + Playwright</h3>
                <p className="text-sm text-slate-300">
                  借助组件故事与端到端测试保障交互稳定性，Tailwind 原子类让测试用例保持简洁。
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-3xl border border-white/5 bg-white/5 p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-200">团队反馈</p>
            <h2 className="mt-4 text-3xl font-semibold text-white">设计师与开发都爱用</h2>
            <p className="mt-4 text-sm text-slate-300">
              无论你是产品设计师还是前端工程师，这个模板都能作为沟通基线。组件结构清晰，可快速拆解进行复用或迭代。
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {['UI/UX 团队', '前端工程组', '业务产品线', '运维与平台'].map((group) => (
              <div
                key={group}
                className="rounded-3xl border border-white/10 bg-slate-950/70 p-6 shadow-[0_14px_50px_rgba(15,23,42,0.4)]"
              >
                <p className="text-sm font-semibold text-white">{group}</p>
                <p className="mt-4 text-sm text-slate-300">
                  “基于 Tailwind 的组件库，我们可以在设计评审环节直接查看真实界面，减少沟通成本。”
                </p>
              </div>
            ))}
          </div>
        </section>

        <section id="faq" className="space-y-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.32em] text-slate-400">常见问题</p>
            <h2 className="mt-2 text-3xl font-semibold text-white">快速了解更多细节</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {faqs.map((item) => (
              <div key={item.question} className="rounded-3xl border border-white/5 bg-white/5 p-6">
                <h3 className="text-sm font-semibold text-white">{item.question}</h3>
                <p className="mt-3 text-sm text-slate-300">{item.answer}</p>
              </div>
            ))}
          </div>
        </section>

        <footer className="rounded-3xl border border-cyan-400/40 bg-cyan-400/10 p-10 text-center text-slate-100 shadow-[0_20px_80px_rgba(6,182,212,0.35)]">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-100">准备开始了吗？</p>
          <h2 className="mt-4 text-3xl font-semibold text-white">立即 Fork 项目，量身打造你的设计系统</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm text-cyan-50/80">
            Tailwind 4 与 Next.js 14 的组合适用于设计系统、数据仪表盘、营销官网等场景。修改组件数据即可快速适配你的业务需求。
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <a
              className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
              href="https://github.com/vercel/next.js/tree/canary/examples"
              target="_blank"
              rel="noreferrer"
            >
              浏览更多模板
            </a>
            <a
              className="inline-flex items-center justify-center rounded-full border border-white/40 px-6 py-3 text-sm font-semibold text-white transition hover:border-white hover:bg-white/10"
              href="https://tailwindcss.com/docs"
              target="_blank"
              rel="noreferrer"
            >
              Tailwind 文档
            </a>
          </div>
        </footer>
      </div>
    </main>
  )
}
