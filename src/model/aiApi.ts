// src/model/aiApi.ts
// 🤖 通用AI翻译接口定义

// 🌊 流式响应回调类型
export type StreamCallback = (chunk: string, isComplete: boolean) => void

// 🎯 翻译配置接口
export interface TranslationConfig {
  temperature?: number
  maxTokens?: number
  model?: string
}

// 🤖 AI提供商枚举
export enum AIProvider {
  DEEPSEEK = 'deepseek',
  OPENAI = 'openai',
  CLAUDE = 'claude',
  GEMINI = 'gemini'
}

// 📊 模型信息接口
export interface ModelInfo {
  provider: string
  model: string
  baseURL: string
  features: string[]
}

// 🔍 连接测试结果
export interface ConnectionTestResult {
  success: boolean
  latency?: number
  error?: string
}

// 🤖 通用AI翻译器接口
export interface AITranslator {
  // 🌊 流式翻译
  translateStream(
    text: string,
    targetLang: string,
    onStream: StreamCallback,
    config?: TranslationConfig
  ): Promise<void>

  // 🔄 普通翻译
  translate(text: string, targetLang: string, config?: TranslationConfig): Promise<string>

  // 🔍 测试连接
  testConnection(): Promise<boolean>

  // 📊 获取模型信息
  getModelInfo(): ModelInfo

  // 🛠️ 获取支持的语言列表
  getSupportedLanguages(): string[]
}

// 🎯 默认翻译配置
export const DEFAULT_TRANSLATION_CONFIG: TranslationConfig = {
  temperature: 0.7,
  maxTokens: 2000
}

// 🌍 支持的语言列表
export const SUPPORTED_LANGUAGES = [
  'Chinese',
  'English',
  'Japanese',
  'Korean',
  'French',
  'German',
  'Spanish',
  'Russian',
  'Italian',
  'Portuguese',
  'Arabic',
  'Thai',
  'Vietnamese'
]

// 🛠️ 语言检测工具
export class LanguageDetector {
  static detectLanguage(text: string): string {
    // Detect Chinese characters
    if (/[\u4e00-\u9fff]/.test(text)) {
      return 'Chinese'
    }

    // Detect Japanese characters
    if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) {
      return 'Japanese'
    }

    // Detect Korean characters
    if (/[\uac00-\ud7af]/.test(text)) {
      return 'Korean'
    }

    // Detect Arabic characters
    if (/[\u0600-\u06ff]/.test(text)) {
      return 'Arabic'
    }

    // Detect Russian characters
    if (/[\u0400-\u04ff]/.test(text)) {
      return 'Russian'
    }

    // Default to English
    return 'English'
  }

  static getAutoTargetLanguage(sourceText: string): string {
    const detected = this.detectLanguage(sourceText)

    // If Chinese is detected, translate to English
    if (detected === 'Chinese') {
      return 'English'
    }

    // Other languages translate to Chinese
    return 'Chinese'
  }
}

// 🚨 错误处理工具
export class TranslationError extends Error {
  constructor(
    message: string,
    public provider: AIProvider,
    public code?: string,
    public originalError?: unknown
  ) {
    super(message)
    this.name = 'TranslationError'
  }

  static formatError(error: unknown, provider: AIProvider): TranslationError {
    if (error instanceof TranslationError) {
      return error
    }

    if (error instanceof Error) {
      let code = 'UNKNOWN_ERROR'
      let message = error.message

      if (error.message.includes('API key')) {
        code = 'INVALID_API_KEY'
        message = 'Invalid API key, please check configuration'
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        code = 'NETWORK_ERROR'
        message = 'Network connection failed, please check network'
      } else if (error.message.includes('rate limit')) {
        code = 'RATE_LIMIT_ERROR'
        message = 'API call rate limit exceeded, please try again later'
      } else if (error.message.includes('quota')) {
        code = 'QUOTA_EXCEEDED'
        message = 'API quota exceeded, please check account'
      }

      return new TranslationError(message, provider, code, error)
    }

    return new TranslationError('Unknown error', provider, 'UNKNOWN_ERROR', error)
  }
}
