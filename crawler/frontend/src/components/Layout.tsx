import { Outlet, Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

const Layout = () => {
  const location = useLocation();

  const navigation = [
    { name: '爬虫测试', href: '/crawler', icon: '🕷️' },
    { name: '文件管理', href: '/files', icon: '📁' },
    { name: 'API测试', href: '/api', icon: '🔧' },
    { name: '媒体测试', href: '/media', icon: '🎬' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* 导航栏 */}
      <nav className="border-b border-border bg-card">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex">
              <div className="flex flex-shrink-0 items-center">
                <h1 className="text-xl font-bold text-foreground">
                  Web Crawler Dashboard
                </h1>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      'inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium transition-colors',
                      location.pathname === item.href
                        ? 'border-primary text-primary'
                        : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
                    )}
                  >
                    <span className="mr-2">{item.icon}</span>
                    {item.name}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* 主要内容区域 */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;