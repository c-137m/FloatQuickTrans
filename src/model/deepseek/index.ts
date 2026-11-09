// src/model/openai/index.ts
import OpenAI from 'openai'
import { TRANSLATION_SYSTEM_PROMPT } from '../translationPrompt'

// 🎯 DeepSeek翻译配置
const DEEPSEEK_CONFIG = {
  baseURL: 'https://api.deepseek.com',
  apiKey: '', // 🔑 替换为您的真实API Key
  model: 'deepseek-chat'
}

// 🌊 流式响应回调类型
export type StreamCallback = (chunk: string, isComplete: boolean) => void

// 🤖 DeepSeek翻译API类
export class DeepSeekTranslator {
  private client: OpenAI

  constructor(apiKey?: string) {
    const finalApiKey = apiKey || DEEPSEEK_CONFIG.apiKey
    console.log(
      '🔑 DeepSeek constructor - API Key:',
      finalApiKey ? `${finalApiKey.substring(0, 8)}...` : 'MISSING'
    )

    this.client = new OpenAI({
      baseURL: DEEPSEEK_CONFIG.baseURL,
      apiKey: finalApiKey,
      defaultHeaders: {
        Authorization: `Bearer ${finalApiKey}`
      },
      dangerouslyAllowBrowser: true // 🔐 Electron环境安全，允许浏览器调用
    })
  }

  // 🌊 流式翻译方法
  async translateStream(
    text: string,
    targetLang: string = 'Chinese',
    onStream: StreamCallback
  ): Promise<void> {
    try {
      console.log('🚀 Starting DeepSeek streaming translation:', {
        text: text.substring(0, 50) + '...',
        targetLang
      })

      const stream = await this.client.chat.completions.create({
        model: DEEPSEEK_CONFIG.model,
        messages: [
          {
            role: 'system',
            content: TRANSLATION_SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: text
          }
        ],
        stream: true, // 🌊 启用流式响应
        temperature: 0.7,
        max_tokens: 2000
      })

      let accumulatedText = ''

      // 🌊 处理流式响应
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content

        if (content) {
          accumulatedText += content
          console.log('📝 Received streaming content:', content)
          onStream(content, false) // 实时回调每个chunk
        }

        // 检查是否完成
        if (chunk.choices[0]?.finish_reason === 'stop') {
          console.log('✅ DeepSeek translation completed:', accumulatedText)
          onStream('', true) // 标记完成
          break
        }
      }
    } catch (error) {
      console.error('❌ DeepSeek translation failed:', error)
      const errorMessage = this.formatError(error)
      onStream(`Translation failed: ${errorMessage}`, true)
      throw error
    }
  }

  // 🔄 非流式翻译方法（作为备选）
  async translate(text: string, targetLang: string = 'Chinese'): Promise<string> {
    try {
      console.log('🚀 Starting DeepSeek translation:', {
        text: text.substring(0, 50) + '...',
        targetLang
      })

      const response = await this.client.chat.completions.create({
        model: DEEPSEEK_CONFIG.model,
        messages: [
          {
            role: 'system',
            content: TRANSLATION_SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: text
          }
        ],
        stream: false,
        temperature: 0.7,
        max_tokens: 2000
      })

      const result = response.choices[0]?.message?.content || ''
      console.log('✅ DeepSeek translation completed:', result)
      return result
    } catch (error) {
      console.error('❌ DeepSeek translation failed:', error)
      throw new Error(this.formatError(error))
    }
  }

  // 🔍 测试连接方法
  async testConnection(): Promise<boolean> {
    try {
      console.log('🔍 Testing DeepSeek connection...')

      const response = await this.client.chat.completions.create({
        model: DEEPSEEK_CONFIG.model,
        messages: [
          {
            role: 'user',
            content: 'Hello, please reply with exactly "Connection successful" in English.'
          }
        ],
        stream: false,
        max_tokens: 20,
        temperature: 0
      })

      const result = response.choices[0]?.message?.content?.includes('successful')
      console.log(result ? '✅ DeepSeek connection successful' : '⚠️ DeepSeek connection abnormal')
      return result || false
    } catch (error) {
      console.error('❌ DeepSeek connection test failed:', error)
      return false
    }
  }

  // 📊 获取模型信息
  getModelInfo(): { provider: string; model: string; baseURL: string; features: string[] } {
    return {
      provider: 'DeepSeek',
      model: DEEPSEEK_CONFIG.model,
      baseURL: DEEPSEEK_CONFIG.baseURL,
      features: [
        'Streaming Response',
        'Chinese Optimized',
        'OpenAI Compatible',
        'Multi-language Translation'
      ]
    }
  }

  // 🛠️ 格式化错误信息
  private formatError(error: unknown): string {
    if (error instanceof Error) {
      if (error.message.includes('API key')) {
        return 'Invalid API key, please check configuration'
      } else if (error.message.includes('network')) {
        return 'Network connection failed, please check network'
      } else if (error.message.includes('rate limit')) {
        return 'API call rate limit exceeded, please try again later'
      } else {
        return error.message
      }
    }
    return 'Unknown error'
  }
}

// 🎯 简化的直接调用函数（流式）
export async function translateWithDeepSeek(
  text: string,
  onStream: StreamCallback,
  targetLang: string = 'Chinese',
  apiKey?: string
): Promise<void> {
  const translator = new DeepSeekTranslator(apiKey)
  console.log('🔑 translateWithDeepSeek - API Key---->:', apiKey)
  await translator.translateStream(text, targetLang, onStream)
}

// 🎯 简化的直接调用函数（非流式）
export async function translateTextWithDeepSeek(
  text: string,
  targetLang: string = 'Chinese'
): Promise<string> {
  const translator = new DeepSeekTranslator()
  return await translator.translate(text, targetLang)
}

// 🔍 连接测试函数
export async function testDeepSeekConnection(): Promise<boolean> {
  const translator = new DeepSeekTranslator()
  return await translator.testConnection()
}

// 默认导出
export default DeepSeekTranslator
