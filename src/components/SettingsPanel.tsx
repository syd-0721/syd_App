import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Sun,
  Moon,
  Type,
  RotateCcw,
  KeyRound,
  Eye,
  EyeOff,
  Check,
  Sparkles,
  AlertTriangle,
  Download,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export type ThemeMode = 'light' | 'dark';
export type FontStyle = 'sans' | 'serif' | 'mono';
export type FontScale = 'sm' | 'md' | 'lg';

export interface DeepSeekUserConfig {
  apiKey: string;
  baseUrl: string;
  model: 'deepseek-chat' | 'deepseek-reasoner';
}

interface SettingsPanelProps {
  theme: ThemeMode;
  onChangeTheme: (theme: ThemeMode) => void;
  fontStyle: FontStyle;
  onChangeFontStyle: (font: FontStyle) => void;
  fontScale: FontScale;
  onChangeFontScale: (scale: FontScale) => void;
  deepseekConfig: DeepSeekUserConfig;
  onChangeDeepseekConfig: (config: DeepSeekUserConfig) => void;
  onResetAllToZero: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  theme,
  onChangeTheme,
  fontStyle,
  onChangeFontStyle,
  fontScale,
  onChangeFontScale,
  deepseekConfig,
  onChangeDeepseekConfig,
  onResetAllToZero,
}) => {
  const [apiKeyInput, setApiKeyInput] = useState(deepseekConfig.apiKey);
  const [baseUrlInput, setBaseUrlInput] = useState(
    deepseekConfig.baseUrl || 'https://api.deepseek.com'
  );
  const [modelInput, setModelInput] = useState<'deepseek-chat' | 'deepseek-reasoner'>(
    deepseekConfig.model || 'deepseek-chat'
  );
  const [showKey, setShowKey] = useState(false);
  const [savedToast, setSavedToast] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetDoneToast, setResetDoneToast] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  const { isInstallable, isInstalled, install } = usePWAInstall();

  useEffect(() => {
    setApiKeyInput(deepseekConfig.apiKey);
    setBaseUrlInput(deepseekConfig.baseUrl || 'https://api.deepseek.com');
    setModelInput(deepseekConfig.model || 'deepseek-chat');
  }, [deepseekConfig]);

  const handleSaveDeepSeek = (e: React.FormEvent) => {
    e.preventDefault();
    onChangeDeepseekConfig({
      apiKey: apiKeyInput.trim(),
      baseUrl: baseUrlInput.trim() || 'https://api.deepseek.com',
      model: modelInput,
    });
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2000);
  };

  const handleConfirmZeroReset = () => {
    onResetAllToZero();
    setShowResetConfirm(false);
    setResetDoneToast(true);
    setTimeout(() => setResetDoneToast(false), 2000);
  };

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowInstallGuide(true);
    }
  };

  const hasCustomKey = Boolean(deepseekConfig.apiKey && deepseekConfig.apiKey.trim());

  return (
    <>
      <section
        aria-label="偏好设置便当盒"
        className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-stretch"
      >
        {/* 便当格 A (App Icon & Mobile Install Tile - 12 cols): Eg 东方账 图标与手机安装 */}
        <div
          data-testid="app-install-card"
          className="sm:col-span-12 liquid-glass p-5 sm:p-6 flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <img
              src="/app-icon.png"
              alt="Eg 东方账 图标"
              className="w-12 h-12 rounded-2xl border border-[var(--ef-border)] object-cover shrink-0 shadow-xs"
            />
            <div className="min-w-0">
              <h3 className="type-title whitespace-nowrap">Eg 东方账</h3>
              <span className="type-caption block whitespace-nowrap">
                {isInstalled ? '已安装至桌面' : '桌面应用 · APK 安装'}
              </span>
            </div>
          </div>

          {!isInstalled && (
            <button
              type="button"
              data-testid="pwa-install-btn"
              onClick={handleInstallClick}
              className="min-h-[40px] px-4 py-2 rounded-2xl bg-[#93B259] hover:bg-[#82A248] text-white type-caption !text-white font-semibold flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>手机安装</span>
            </button>
          )}
        </div>

        {/* 便当格 0 (Primary Full-Width Bento Tile - 12 cols): DeepSeek 接口配置（精简无括号说明） */}
        <div
          data-testid="deepseek-settings-card"
          className="sm:col-span-12 liquid-glass p-5 sm:p-6 space-y-4"
        >
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-[#93B259] shrink-0" />
            <h3 className="type-title whitespace-nowrap">DeepSeek 接口</h3>
          </div>

          <form onSubmit={handleSaveDeepSeek} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-7 space-y-1">
                <label htmlFor="deepseek-api-key-input" className="type-caption block">
                  API 令牌
                </label>
                <div className="relative flex items-center">
                  <input
                    id="deepseek-api-key-input"
                    type={showKey ? 'text' : 'password'}
                    placeholder="sk-..."
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    className="w-full min-h-[44px] pl-3.5 pr-10 py-2 liquid-glass-subtle font-mono type-body !text-[var(--ef-fg-strong)] focus:outline-none focus:ring-2 focus:ring-[#93B259]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((prev) => !prev)}
                    aria-label={showKey ? '隐藏令牌' : '显示令牌'}
                    className="absolute right-2 min-h-[32px] min-w-[32px] flex items-center justify-center text-[var(--ef-fg)] opacity-70 hover:opacity-100 cursor-pointer"
                  >
                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="sm:col-span-5 space-y-1">
                <label htmlFor="deepseek-base-url-input" className="type-caption block">
                  接口地址
                </label>
                <input
                  id="deepseek-base-url-input"
                  type="url"
                  placeholder="https://api.deepseek.com"
                  value={baseUrlInput}
                  onChange={(e) => setBaseUrlInput(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 py-2 liquid-glass-subtle font-mono type-body !text-[var(--ef-fg-strong)] focus:outline-none focus:ring-2 focus:ring-[#93B259]"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {(
                  [
                    { id: 'deepseek-chat', label: 'DeepSeek-V3' },
                    { id: 'deepseek-reasoner', label: 'DeepSeek-R1' },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setModelInput(m.id)}
                    aria-pressed={modelInput === m.id}
                    className={`min-h-[38px] px-3.5 py-1.5 rounded-2xl type-caption font-semibold whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                      modelInput === m.id
                        ? 'bg-[#93B259] !text-white shadow-sm'
                        : 'liquid-glass-subtle hover:opacity-90'
                    }`}
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 ml-auto">
                {savedToast && (
                  <span
                    role="status"
                    className="type-caption !text-[#93B259] font-semibold flex items-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    已保存
                  </span>
                )}
                {hasCustomKey && (
                  <button
                    type="button"
                    onClick={() => {
                      setApiKeyInput('');
                      onChangeDeepseekConfig({
                        apiKey: '',
                        baseUrl: 'https://api.deepseek.com',
                        model: 'deepseek-chat',
                      });
                    }}
                    className="min-h-[38px] px-3.5 py-1.5 liquid-glass-subtle type-caption !text-[var(--ef-fg-strong)] whitespace-nowrap cursor-pointer"
                  >
                    清空
                  </button>
                )}
                <button
                  type="submit"
                  data-testid="save-deepseek-key-btn"
                  className="min-h-[38px] px-4 py-1.5 rounded-2xl bg-[#93B259] hover:bg-[#82A248] text-white type-caption !text-white font-semibold flex items-center gap-1.5 whitespace-nowrap cursor-pointer shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>保存</span>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* 便当格 1 (Primary Theme Tile - 7 cols): 白天与黑夜模式 */}
        <div className="sm:col-span-7 liquid-glass p-6 flex flex-col justify-between gap-4">
          <div className="flex items-center gap-2">
            {theme === 'light' ? (
              <Sun className="w-4 h-4 text-[#93B259]" />
            ) : (
              <Moon className="w-4 h-4 text-[#93B259]" />
            )}
            <h3 className="type-title">外观模式</h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onChangeTheme('light')}
              aria-pressed={theme === 'light'}
              className={`min-h-[48px] px-4 py-3 rounded-2xl flex items-center justify-center gap-2 type-body font-semibold whitespace-nowrap cursor-pointer ${
                theme === 'light'
                  ? 'bg-[#93B259] !text-white shadow-sm'
                  : 'liquid-glass-subtle hover:opacity-90'
              }`}
            >
              <Sun className="w-4 h-4 shrink-0" />
              <span>白天模式</span>
            </button>

            <button
              type="button"
              onClick={() => onChangeTheme('dark')}
              aria-pressed={theme === 'dark'}
              className={`min-h-[48px] px-4 py-3 rounded-2xl flex items-center justify-center gap-2 type-body font-semibold whitespace-nowrap cursor-pointer ${
                theme === 'dark'
                  ? 'bg-[#93B259] !text-white shadow-sm'
                  : 'liquid-glass-subtle hover:opacity-90'
              }`}
            >
              <Moon className="w-4 h-4 shrink-0" />
              <span>黑夜模式</span>
            </button>
          </div>
        </div>

        {/* 便当格 2 (Secondary Data Tile - 5 cols): 数据管理（全部归零 + 弹窗防误触） */}
        <div className="sm:col-span-5 liquid-glass p-6 flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="type-title">数据管理</h3>
            {resetDoneToast && (
              <span
                role="status"
                className="type-caption !text-[#93B259] font-semibold flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                已归零
              </span>
            )}
          </div>

          <button
            type="button"
            data-testid="reset-zero-btn"
            onClick={() => setShowResetConfirm(true)}
            className="w-full min-h-[48px] px-4 py-3 liquid-glass-subtle hover:opacity-90 type-body font-semibold !text-[#D14343] dark:!text-[#E67E80] flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 shrink-0" />
            <span>全部归零</span>
          </button>
        </div>

        {/* 便当格 3 (Font Family Tile - 6 cols): 字体样式 */}
        <div className="sm:col-span-6 liquid-glass p-6 flex flex-col justify-between gap-4">
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4 text-[#93B259]" />
            <h3 className="type-title">字体样式</h3>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'sans' as const, label: '无衬线' },
              { id: 'serif' as const, label: '衬线体' },
              { id: 'mono' as const, label: '等宽体' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onChangeFontStyle(item.id)}
                aria-pressed={fontStyle === item.id}
                className={`min-h-[46px] px-3 py-2 rounded-2xl type-body font-semibold whitespace-nowrap cursor-pointer ${
                  fontStyle === item.id
                    ? 'bg-[#93B259] !text-white shadow-sm'
                    : 'liquid-glass-subtle hover:opacity-90'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* 便当格 4 (Font Scale Tile - 6 cols): 字号大小 */}
        <div className="sm:col-span-6 liquid-glass p-6 flex flex-col justify-between gap-4">
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4 text-[#93B259]" />
            <h3 className="type-title">字号大小</h3>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'sm' as const, label: '紧凑' },
              { id: 'md' as const, label: '标准' },
              { id: 'lg' as const, label: '大字号' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onChangeFontScale(item.id)}
                aria-pressed={fontScale === item.id}
                className={`min-h-[46px] px-3 py-2 rounded-2xl type-body font-semibold cursor-pointer ${
                  fontScale === item.id
                    ? 'bg-[#93B259] !text-white shadow-sm'
                    : 'liquid-glass-subtle hover:opacity-90'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 手机安装说明弹窗 (Layer 2 Floating Modal via Portal) */}
      {showInstallGuide &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-guide-title"
            data-testid="install-guide-modal"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs"
          >
            <div className="liquid-glass-floating w-full max-w-xs p-6 rounded-3xl space-y-4 text-left spatial-morph border border-[var(--ef-border)]">
              <div className="flex items-center gap-3">
                <img
                  src="/app-icon.png"
                  alt="Eg 东方账"
                  className="w-11 h-11 rounded-2xl border border-[var(--ef-border)] object-cover shrink-0"
                />
                <div>
                  <h4 id="install-guide-title" className="type-title">
                    下载 Eg 东方账
                  </h4>
                  <span className="type-caption block">手机端安装方式</span>
                </div>
              </div>

              <div className="space-y-2 type-caption !text-[var(--ef-fg-strong)]">
                <div className="p-3 liquid-glass-subtle space-y-1">
                  <strong className="block text-[#93B259]">方式一：GitHub 自动打包 APK</strong>
                  <span>上传至 GitHub 后，在仓库 Actions 页面直接下载 Eg-东方账.apk 安装。</span>
                </div>
                <div className="p-3 liquid-glass-subtle space-y-1">
                  <strong className="block text-[#93B259]">方式二：手机浏览器直接安装</strong>
                  <span>手机浏览器打开网址，点击菜单「添加到主屏幕」即可生成桌面 App。</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowInstallGuide(false)}
                className="w-full min-h-[42px] px-4 py-2 rounded-2xl bg-[#93B259] hover:bg-[#82A248] type-body font-semibold !text-white cursor-pointer"
              >
                知道了
              </button>
            </div>
          </div>,
          document.body
        )}

      {/* 防误触确认弹窗 (Layer 2 Floating Modal via Portal) */}
      {showResetConfirm &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-confirm-title"
            data-testid="reset-confirm-modal"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs"
          >
            <div className="liquid-glass-floating w-full max-w-xs p-6 rounded-3xl space-y-5 text-center spatial-morph border border-[var(--ef-border)]">
              <div className="w-11 h-11 rounded-2xl bg-[#D14343]/15 text-[#D14343] dark:text-[#E67E80] flex items-center justify-center mx-auto">
                <AlertTriangle className="w-5 h-5" />
              </div>

              <div className="space-y-1.5">
                <h4 id="reset-confirm-title" className="type-title">
                  确认全部归零？
                </h4>
                <p className="type-caption">
                  所有预算与记账记录将全部归 0
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  data-testid="cancel-reset-btn"
                  onClick={() => setShowResetConfirm(false)}
                  className="min-h-[44px] px-4 py-2 rounded-2xl liquid-glass-subtle type-body font-semibold !text-[var(--ef-fg-strong)] cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="button"
                  data-testid="confirm-reset-btn"
                  onClick={handleConfirmZeroReset}
                  className="min-h-[44px] px-4 py-2 rounded-2xl bg-[#D14343] hover:bg-[#B83232] type-body font-semibold !text-white cursor-pointer shadow-sm"
                >
                  确认归零
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
