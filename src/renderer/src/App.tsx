import { useState, useRef, useEffect } from 'react'
import './App.css'
import { TranslationManager } from '../../model/adapter'
import { AIProvider } from '../../model/aiApi'
import SettingsDialog from './components/SettingsDialog'
import { ProviderContextProvider, useProvider } from './context/ProviderContext'
import { COMPREHENSIVE_LANGUAGES } from '../../model/languages/languageMap'
import { COMPLETE_TTS_LANGUAGES } from '../../model/languages/ttsLanguageMap'
// import { validateLanguage, getLanguageDisplayName } from '../../model/languages'

// 🔊 获取TTS语言代码的函数
const getTTSLanguageCode = (userInput: string): string => {
  // 第一步：用户输入 → 标准语言名称
  const standardName = COMPREHENSIVE_LANGUAGES[userInput] || userInput

  // 第二步：标准语言名称 → TTS语言代码
  const ttsCode = COMPLETE_TTS_LANGUAGES[standardName] || 'en-US'

  console.log(`🔊 语言映射: "${userInput}" → "${standardName}" → "${ttsCode}"`)
  return ttsCode
}

// 朗读文本函数
const speakText = (text: string, language: string = 'en-US'): void => {
  if (!text.trim()) return

  // 停止当前朗读
  speechSynthesis.cancel()

  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = language
  utterance.rate = 0.9 // 稍慢一点
  utterance.volume = 0.8

  console.log(`🔊 开始朗读: "${text.substring(0, 50)}..." (${language})`)

  speechSynthesis.speak(utterance)
}

// 检测文本语言（简单版本）
const detectLanguage = (text: string): string => {
  if (!text.trim()) return 'en-US'

  // 简单的中文检测
  if (/[\u4e00-\u9fff]/.test(text)) {
    return 'zh-CN'
  }

  // 简单的日文检测
  if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) {
    return 'ja-JP'
  }

  // 默认英文
  return 'en-US'
}

// 🧪 Mock翻译功能 - 用于演示
const mockTranslateText = async (text: string, targetLang: string): Promise<string> => {
  // 模拟API延迟
  await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 1200))

  // 简单的Mock翻译词典
  const translations: Record<string, Record<string, string>> = {
    Chinese: {
      hello: '你好',
      world: '世界',
      'thank you': '谢谢',
      goodbye: '再见',
      'good morning': '早上好',
      'good evening': '晚上好',
      'how are you': '你好吗',
      'what is your name': '你叫什么名字',
      'nice to meet you': '很高兴见到你',
      'i love you': '我爱你',
      please: '请',
      sorry: '对不起',
      'excuse me': '不好意思',
      yes: '是的',
      no: '不是',
      translation: '翻译',
      software: '软件',
      computer: '电脑',
      internet: '互联网',
      technology: '技术'
    },
    Japanese: {
      hello: 'こんにちは',
      world: '世界',
      'thank you': 'ありがとう',
      goodbye: 'さようなら',
      'good morning': 'おはよう',
      'good evening': 'こんばんは',
      'how are you': '元気ですか',
      translation: '翻訳',
      software: 'ソフトウェア'
    },
    French: {
      hello: 'bonjour',
      world: 'monde',
      'thank you': 'merci',
      goodbye: 'au revoir',
      'good morning': 'bonjour',
      'good evening': 'bonsoir',
      translation: 'traduction',
      software: 'logiciel'
    },
    Spanish: {
      hello: 'hola',
      world: 'mundo',
      'thank you': 'gracias',
      goodbye: 'adiós',
      'good morning': 'buenos días',
      'good evening': 'buenas tardes',
      translation: 'traducción',
      software: 'software'
    }
  }

  const lowerText = text.toLowerCase().trim()
  const targetDict = translations[targetLang]

  if (targetDict && targetDict[lowerText]) {
    return targetDict[lowerText]
  }

  // 如果没有找到精确匹配，返回通用翻译
  return `🤖 Mock翻译: "${text}" → ${targetLang} (演示模式，请配置真实API Key获得准确翻译)`
}

function App(): React.JSX.Element {
  const [inputText, setInputText] = useState('')
  const [translatedText, setTranslatedText] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // 🔊 朗读状态
  const [isInputSpeaking, setIsInputSpeaking] = useState(false)
  const [isOutputSpeaking, setIsOutputSpeaking] = useState(false)

  // 🔧 组件加载时输出日志
  useEffect(() => {
    console.log('🚀 App component loaded')
    console.log('🔧 Initial state:', { inputText, translatedText, isLoading })
  }, [])
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [connectionStatus, setConnectionStatus] = useState<
    'unknown' | 'testing' | 'connected' | 'failed'
  >('unknown')
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  // 替换原有currentProvider逻辑
  const { currentProvider } = useProvider()

  // 监听Settings中的提供商选择变化
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'quick-trans-current-provider' && e.newValue) {
        console.log('🔄 Provider changed from Settings:', e.newValue)
        // setCurrentProvider(e.newValue as AIProvider) // This line is removed as per the new_code
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  // 🌍 语言选择状态
  const [targetLanguage, setTargetLanguage] = useState(() => {
    // 从localStorage加载保存的语言设置
    return localStorage.getItem('quick-trans-target-language') || 'Chinese'
  })
  const [isLanguageInputActive, setIsLanguageInputActive] = useState(false)
  const [languageInput, setLanguageInput] = useState('')

  // 🔍 调试localStorage内容
  const debugLocalStorage = (): void => {
    console.log('🔍 ==> localStorage全部内容:')
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key) {
        const value = localStorage.getItem(key)
        console.log(`🔍 Key: "${key}", Value:`, value)
      }
    }
    console.log('🔍 ==> localStorage检查结束')
  }

  // 🔑 获取API Key配置（通用版本，支持不同提供商）
  const getApiKey = (provider?: AIProvider): string | null => {
    const targetProvider = provider || currentProvider
    console.log(`🔍 Starting getApiKey() for provider: ${targetProvider}...`)
    debugLocalStorage() // 先查看localStorage所有内容

    try {
      const settings = localStorage.getItem('quick-trans-api-settings')
      console.log('🔍 localStorage data:', settings)
      if (settings) {
        const parsed = JSON.parse(settings)
        console.log('🔍 Parsed data:', parsed)
        const providerConfig = parsed.find(
          (config: { provider: string; apiKey?: string }) => config.provider === targetProvider
        )
        console.log(`🔍 ${targetProvider} config:`, providerConfig)
        return providerConfig?.apiKey || null
      } else {
        // 🔧 如果localStorage为空，提示用户配置
        console.log('⚠️ No API settings found in localStorage')
        console.log('💡 Please open Settings to configure your API Key')
        return null
      }
    } catch (error) {
      console.warn('Failed to load API settings:', error)
    }
    return null
  }

  // const [isAlwaysOnTop, setIsAlwaysOnTop] = useState(true)
  // const [message, setMessage] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // 🔊 朗读输入文本
  const handleSpeakInput = (): void => {
    if (!inputText.trim()) {
      console.warn('⚠️ 输入文本为空，无法朗读')
      return
    }

    if (isInputSpeaking) {
      // 正在朗读，点击停止
      speechSynthesis.cancel()
      setIsInputSpeaking(false)
      console.log('🔇 停止朗读输入文本')
    } else {
      // 开始朗读
      const language = detectLanguage(inputText)
      setIsInputSpeaking(true)

      const utterance = new SpeechSynthesisUtterance(inputText)
      utterance.lang = language
      utterance.rate = 0.9
      utterance.volume = 0.8

      utterance.onend = () => {
        setIsInputSpeaking(false)
        console.log('✅ 输入文本朗读完成')
      }

      utterance.onerror = () => {
        setIsInputSpeaking(false)
        console.error('❌ 输入文本朗读失败')
      }

      speechSynthesis.speak(utterance)
      console.log(`🔊 开始朗读输入文本 (${language})`)
    }
  }

  // 🔊 朗读输出文本
  const handleSpeakOutput = (): void => {
    if (!translatedText.trim()) {
      console.warn('⚠️ 翻译结果为空，无法朗读')
      return
    }

    if (isOutputSpeaking) {
      // 正在朗读，点击停止
      speechSynthesis.cancel()
      setIsOutputSpeaking(false)
      console.log('🔇 停止朗读翻译结果')
    } else {
      // 开始朗读
      const language = getTTSLanguageCode(targetLanguage)
      setIsOutputSpeaking(true)

      const utterance = new SpeechSynthesisUtterance(translatedText)
      utterance.lang = language
      utterance.rate = 0.9
      utterance.volume = 0.8

      utterance.onend = () => {
        setIsOutputSpeaking(false)
        console.log('✅ 翻译结果朗读完成')
      }

      utterance.onerror = () => {
        setIsOutputSpeaking(false)
        console.error('❌ 翻译结果朗读失败')
      }

      speechSynthesis.speak(utterance)
      console.log(`🔊 开始朗读翻译结果 (${language})`)
    }
  }

  useEffect(() => {
    return window.electron.ipcRenderer.on('trigger-speak-input', handleSpeakInput)
  }, [inputText, isInputSpeaking])

  useEffect(() => {
    return window.electron.ipcRenderer.on('trigger-speak-output', handleSpeakOutput)
  }, [translatedText, isOutputSpeaking, targetLanguage])

  // 🔍 测试 DeepSeek 连接
  const testConnection = async (): Promise<void> => {
    setConnectionStatus('testing')
    try {
      // 使用 TranslationManager 测试连接
      const manager = new TranslationManager(currentProvider)
      const isConnected = await manager.testCurrentConnection()
      setConnectionStatus(isConnected ? 'connected' : 'failed')

      if (isConnected) {
        console.log('✅ Connection test successful')
      } else {
        console.log('❌ Connection test failed')
      }
    } catch (error) {
      console.error('🚨 Connection test error:', error)
      setConnectionStatus('failed')
    }
  }

  useEffect(() => {
    // 只在 Windows 下加 class
    if (navigator.userAgent.includes('Windows')) {
      document.body.classList.add('is-windows');
    } else {
      document.body.classList.remove('is-windows');
    }
  }, []);

  // 组件挂载时测试连接
  useEffect(() => {
    testConnection()
  }, [])

  // 🎯 监听输入变化，输入清空时同步清空翻译结果（显示placeholder）
  useEffect(() => {
    if (!inputText.trim() && translatedText) {
      setTranslatedText('') // 🎯 输入清空时，清空翻译结果，显示placeholder
    }
  }, [inputText, translatedText])

  // 🌊 通用流式翻译（支持适配器模式）
  const translate = async (text: string): Promise<void> => {
    if (!text.trim()) return

    console.log(
      `🌊 Starting streaming translation to ${targetLanguage} using ${currentProvider}...`
    )
    setIsLoading(true)
    setTranslatedText('') // 清空之前的结果

    try {
      const apiKey = getApiKey(currentProvider)
      console.log(`🔑 ${currentProvider} API Key:-------->', ${apiKey ? 'configured' : 'missing'}`)
      console.log(`🔑 ${currentProvider} API Key:-------->', ${apiKey}`)

      if (apiKey && apiKey.trim() !== '') {
        console.log(`🔑 Using real API with streaming translation via ${currentProvider}`)

        // 统一使用 TranslationManager
        const manager = new TranslationManager(currentProvider, apiKey)
        await manager.translateTo(text, targetLanguage, (chunk: string, isComplete: boolean) => {
          if (chunk && !isComplete) {
            // 流式追加文本
            setTranslatedText((prev) => prev + chunk)
          }

          if (isComplete) {
            console.log(`✅ ${currentProvider} streaming translation completed`)
          }
        })
      } else {
        // Mock 翻译逻辑保持不变
        console.log('🧪 Using Mock translation with typing effect')
        // Mock翻译也模拟流式效果
        const result = await mockTranslateText(text, targetLanguage)

        // 模拟逐字显示效果
        let index = 0
        const simulateStream = (): void => {
          if (index < result.length) {
            setTranslatedText((prev) => prev + result[index])
            index++
            setTimeout(simulateStream, 30) // 30ms延迟模拟打字效果
          }
        }
        simulateStream()
      }
    } catch (error) {
      console.error('❌ Translation failed:', error)
      // API失败时fallback到Mock
      console.log('🔄 Falling back to Mock translation')
      try {
        const mockResult = await mockTranslateText(text, targetLanguage)
        setTranslatedText(`⚠️ API调用失败，使用Mock翻译: ${mockResult}`)
      } catch {
        setTranslatedText('❌ Translation failed. Please check your connection and API settings.')
      }
    } finally {
      setIsLoading(false)
    }
  }

  // 🌍 简化版本：直接在事件中处理

  // 处理翻译
  const handleTranslate = async (): Promise<void> => {
    if (!inputText.trim()) {
      console.warn('⚠️ No input text to translate')
      return
    }

    console.log('🚀 handleTranslate called with:', inputText.substring(0, 50) + '...')
    await translate(inputText)
  }

  // 🔄 重新测试连接
  // const handleRetestConnection = async (): Promise<void> => {
  //   await testConnection()
  // }

  // 切换超级悬浮模式
  // const toggleAlwaysOnTop = async (): Promise<void> => {
  //   try {
  //     const result = await window.electron.ipcRenderer.invoke('toggle-always-on-top')
  //     if (result.success) {
  //       setIsAlwaysOnTop(result.isAlwaysOnTop)
  //       setMessage(result.message)
  //       setTimeout(() => setMessage(''), 3000)
  //     }
  //   } catch (error) {
  //     console.error('Toggle failed:', error)
  //     setMessage('❌ 切换失败')
  //     setTimeout(() => setMessage(''), 3000)
  //   }
  // }

  // ESC 键关闭窗口, Enter 翻译
  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      // Cmd+Enter触发翻译
      e.preventDefault()
      console.log('⌨️ Cmd+Enter pressed, triggering translation')
      handleTranslate()
    } else if (e.key === 'Escape') {
      // ESC关闭窗口
      console.log('⌨️ ESC pressed, closing window')
      // 简单隐藏，如果有window.close()也可以用
      try {
        if (window.close) {
          window.close()
        }
      } catch (error) {
        console.warn('Cannot close window:', error)
      }
    }
  }

  // 防止拖拽时选择文本
  // const handleMouseDown = (e: React.MouseEvent): void => {
  //   if (e.target instanceof HTMLElement && e.target.closest('.title-bar')) {
  //     e.preventDefault()
  //   }
  // }

  // 🎨 获取连接状态显示
  // const getConnectionStatusDisplay = (): string => {
  //   switch (connectionStatus) {
  //     case 'testing':
  //       return '🔍 Testing...'
  //     case 'connected':
  //       return '✅ DeepSeek Connected'
  //     case 'failed':
  //       return '❌ Connection Failed'
  //     case 'unknown':
  //     default:
  //       return '⚪ Unknown Status'
  //   }
  // }

  // 🌍 语言选择相关函数
  const handleLanguageClick = (): void => {
    console.log('🎯 Language clicked, activating input')
    setIsLanguageInputActive(true)
    setLanguageInput(targetLanguage)
  }

  const handleLanguageSubmit = (value: string): void => {
    console.log('🎯 Language submitted:', value)
    const trimmedValue = value.trim()
    if (trimmedValue) {
      setTargetLanguage(trimmedValue)
      // 保存到localStorage
      localStorage.setItem('quick-trans-target-language', trimmedValue)
    }
    setIsLanguageInputActive(false)
    setLanguageInput('')
  }

  const handleLanguageKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleLanguageSubmit(languageInput)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setIsLanguageInputActive(false)
      setLanguageInput('')
    }
  }

  // 🎯 点击外部区域退出语言编辑模式
  const handleContainerClick = (e: React.MouseEvent): void => {
    // 如果当前在语言编辑模式，且点击的不是特殊区域，则提交并退出编辑模式
    if (isLanguageInputActive) {
      const target = e.target as HTMLElement

      // 检查点击的元素是否是语言input或语言按钮
      const isLanguageInput =
        target.classList.contains('language-input') || target.closest('.language-input')
      const isLanguageButton =
        target.classList.contains('language-button') || target.closest('.language-button')

      // 检查是否点击了主输入区域（应该排除，让用户可以正常输入）
      const isMainInputArea = target.closest('.input-section')

      // 检查是否点击了设置按钮（应该排除，让用户可以正常点击设置）
      const isSettingsButton = target.classList.contains('help-button')

      // 只有当点击的不是这些特殊区域时，才提交语言输入
      if (!isLanguageInput && !isLanguageButton && !isMainInputArea && !isSettingsButton) {
        console.log('🎯 Clicked outside language input, submitting and exiting edit mode')
        // 像按回车键一样提交当前输入内容
        handleLanguageSubmit(languageInput)
      }
    }
  }

  return (
    <div
      className="app-container glass-effect"
      onKeyDown={handleKeyDown}
      onClick={handleContainerClick}
      tabIndex={-1}
    >
      {/* 🔍 连接状态指示器 */}
      {/* <div className="connection-status">
        <span className={`status-indicator ${connectionStatus}`}>
          {getConnectionStatusDisplay()}
        </span>
        {(connectionStatus === 'failed' || connectionStatus === 'testing') && (
          <button
            onClick={handleRetestConnection}
            className="retry-btn"
            disabled={connectionStatus === 'testing'}
          >
            {connectionStatus === 'testing' ? '🔍 Testing...' : '🔄 Retry'}
          </button>
        )}
      </div> */}

      {/* 状态消息 */}
      {/* {message && (
        <div className={`status-message ${message.includes('❌') ? 'error' : 'success'}`}>
          {message} */}
      {/* </div> */}
      {/* )} */}

      {/* 标题栏 */}
      {/* <div className="title-bar">
        <div className="title-info">
          <h2>🔍 快速翻译</h2>
          {isAlwaysOnTop && <span className="super-float-badge">超级悬浮</span>}
        </div>
        <button
          onClick={toggleAlwaysOnTop}
          className={`toggle-button button-press ${isAlwaysOnTop ? 'active' : 'inactive'}`}
          title={isAlwaysOnTop ? '切换到普通模式' : '启用超级悬浮'}
        >
          {isAlwaysOnTop ? '⬇️ 重置' : '🚀 超级悬浮'}
        </button>
      </div> */}

      {/* 输入区域 */}
      <div className="input-section">
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
          <span
            style={{
              fontSize: '10px',
              color: 'rgba(255, 255, 255, 0.6)',
              marginRight: 'auto'
            }}
          >
            Using: {currentProvider.toUpperCase()}
          </span>
          <button
            type="button"
            className="translate-trigger"
            onClick={handleTranslate}
            disabled={isLoading || !inputText.trim()}
            title="trans"
          >
            trans
          </button>
        </div>
        <div style={{ position: 'relative' }}>
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Enter the text to translate..."
            className="input-textarea focus-ring"
            disabled={isLoading}
            rows={2}
          />
          <button
            className={`speak-icon ${isInputSpeaking ? 'speaking' : ''} ${!inputText.trim() ? 'disabled' : ''}`}
            onClick={handleSpeakInput}
            disabled={!inputText.trim()}
            title={isInputSpeaking ? '停止朗读' : '朗读输入文本'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path fillRule="evenodd" d="M8.5 2a.5.5 0 0 1 .5.5v11a.5.5 0 0 1-1 0v-11a.5.5 0 0 1 .5-.5m-2 2a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5m4 0a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5m-6 1.5A.5.5 0 0 1 5 6v4a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m8 0a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m-10 1A.5.5 0 0 1 3 7v2a.5.5 0 0 1-1 0V7a.5.5 0 0 1 .5-.5m12 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0V7a.5.5 0 0 1 .5-.5"/>
            </svg>
          </button>
        </div>
      </div>
      {/* 结果显示 */}
      <div className="result-section" style={{ position: 'relative' }}>
        <div className="result-box">
          {isLoading && !translatedText ? (
            <p className="loading-text">🌊 {currentProvider.toUpperCase()} Translating...</p>
          ) : translatedText ? (
            <p className="result-text">{translatedText}</p>
          ) : (
            <p className="result-placeholder">Translation result will appear here</p>
          )}
        </div>
        <button
          className={`speak-icon-output ${isOutputSpeaking ? 'speaking' : ''} ${!translatedText.trim() ? 'disabled' : ''}`}
          onClick={handleSpeakOutput}
          disabled={!translatedText.trim()}
          title={isOutputSpeaking ? '停止朗读' : '朗读翻译结果'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path fillRule="evenodd" d="M8.5 2a.5.5 0 0 1 .5.5v11a.5.5 0 0 1-1 0v-11a.5.5 0 0 1 .5-.5m-2 2a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5m4 0a.5.5 0 0 1 .5.5v7a.5.5 0 0 1-1 0v-7a.5.5 0 0 1 .5-.5m-6 1.5A.5.5 0 0 1 5 6v4a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m8 0a.5.5 0 0 1 .5.5v4a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m-10 1A.5.5 0 0 1 3 7v2a.5.5 0 0 1-1 0V7a.5.5 0 0 1 .5-.5m12 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0V7a.5.5 0 0 1 .5-.5"/>
          </svg>
        </button>
      </div>

      {/* 使用说明 */}
      <div className="help-section">
        <p className="help-text">
          To{' '}
          {isLanguageInputActive ? (
            <input
              type="text"
              value={languageInput}
              onChange={(e) => setLanguageInput(e.target.value)}
              onKeyDown={handleLanguageKeyDown}
              onBlur={() => handleLanguageSubmit(languageInput)}
              onClick={(e) => e.stopPropagation()} // 阻止事件冒泡到容器
              autoFocus
              className="language-input"
              style={
                {
                  display: 'inline-block',
                  width: '80px',
                  height: '20px',
                  fontSize: '12px',
                  padding: '2px 4px',
                  verticalAlign: 'middle',
                  background: 'rgba(255, 255, 255, 0.9)',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  borderRadius: '4px',
                  outline: 'none',
                  // @ts-ignore WebkitAppRegion is not in React.CSSProperties type but is valid CSS property
                  WebkitAppRegion: 'no-drag'
                } as React.CSSProperties
              }
            />
          ) : (
            <button
              onClick={handleLanguageClick}
              className="language-button"
              style={
                {
                  display: 'inline-block',
                  background: 'transparent',
                  border: 'none',
                  color: 'inherit',
                  fontSize: '12px',
                  cursor: 'pointer',
                  padding: '0 2px',
                  textDecoration: 'underline',
                  // @ts-ignore WebkitAppRegion is not in React.CSSProperties type but is valid CSS property
                  WebkitAppRegion: 'no-drag'
                } as React.CSSProperties
              }
            >
              {targetLanguage}
            </button>
          )}
          | Ctrl/Cmd+Enter Translate | ESC Close | Ctrl+Shift+X Global Toggle
        </p>
        <p className="help-text" style={{ marginTop: '2px' }}>
          <button className="help-button" onClick={() => setIsSettingsOpen(true)}>
            settings
          </button>
          |{' '}
          <button
            className="help-button"
            onClick={() => window.open('https://github.com/hughedward/FloatQuickTrans', '_blank')}
            style={
              {
                // @ts-ignore WebkitAppRegion is not in React.CSSProperties type but is valid CSS property
                WebkitAppRegion: 'no-drag'
              } as React.CSSProperties
            }
          >
            about
          </button>
        </p>
      </div>

      {/* 设置对话框 */}
      <SettingsDialog isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  )
}

// 用ProviderContextProvider包裹App
function AppRoot() {
  return (
    <ProviderContextProvider>
      <App />
    </ProviderContextProvider>
  )
}

export default AppRoot
