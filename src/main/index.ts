import {
  app,
  shell,
  BrowserWindow,
  ipcMain,
  Tray,
  Menu,
  nativeImage,
  globalShortcut,
  dialog
} from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import '../model/proxy'
import path from 'path'

const iconPath = join(__dirname, '../../resources/output.ico');


// 窗口管理器
class WindowManager {
  private windows: Set<BrowserWindow> = new Set()
  private windowOffset = 0

  createWindow(): BrowserWindow {
    const window = new BrowserWindow({
      width: 420,
      height: 196,
      x: 100 + this.windowOffset * 30, // 位置偏移
      y: 100 + this.windowOffset * 30,
      show: false,
      autoHideMenuBar: true,
      type: 'panel',
      alwaysOnTop: true,
      skipTaskbar: false,
      resizable: true,
      frame: false,
      transparent: true,
      //透明度
      opacity: 0.9,
      backgroundColor: '#00000000',
      visualEffectState: 'active',
      titleBarStyle: 'hidden', // 隐藏标题栏
      fullscreenable: false,
      maximizable: false,
      minimizable: false,
      closable: true,
      acceptFirstMouse: true,
      movable: true,
      icon:iconPath,
      webPreferences: {
        preload: join(__dirname, '../preload/index.js'),
        sandbox: false,
        nodeIntegration: false,
        contextIsolation: true
      }
    })

    // 窗口设置
    window.setAlwaysOnTop(true, 'floating')
    window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })

    if (process.platform === 'darwin') {
      window.setWindowButtonVisibility(false)
    }

    // 窗口事件
    window.on('ready-to-show', () => {
      window.show()
      window.focus()
      window.setAlwaysOnTop(true, 'floating')
    })

    window.on('blur', () => {
      window.setAlwaysOnTop(true, 'floating')
      if (process.platform === 'win32') {
        window.setBackgroundColor('#00000000')
      }
    })
    window.on('focus', () => {
      if (process.platform === 'win32') {
        window.setBackgroundColor('#00000000')
      }
    })

    window.on('close', (event) => {
      if (!isQuitting && this.windows.size > 1) {
        // 多窗口时直接关闭当前窗口
        this.removeWindow(window)
      } else if (!isQuitting && this.windows.size === 1) {
        // 最后一个窗口时隐藏到托盘
        event.preventDefault()
        window.hide()
      }
    })

    window.webContents.setWindowOpenHandler((details) => {
      shell.openExternal(details.url)
      return { action: 'deny' }
    })

    // 加载页面
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      window.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
      window.loadFile(join(__dirname, '../renderer/index.html'))
    }

    this.addWindow(window)
    return window
  }

  addWindow(window: BrowserWindow): void {
    this.windows.add(window)
    this.windowOffset = (this.windowOffset + 1) % 10 // 限制偏移量
  }

  removeWindow(window: BrowserWindow): void {
    this.windows.delete(window)
  }

  getAllWindows(): BrowserWindow[] {
    return Array.from(this.windows)
  }

  getWindowCount(): number {
    return this.windows.size
  }

  getFirstWindow(): BrowserWindow | null {
    return this.windows.values().next().value || null
  }
}

// 全局变量
const windowManager = new WindowManager()
let tray: Tray | null = null
let isQuitting = false // 标记应用是否正在退出

function createWindow(): BrowserWindow {
  return windowManager.createWindow()
}

// 创建系统托盘
function createTray(): void {
  try {
    // 托盘图标路径 - 兼容开发和构建环境
    let trayIconPath: string
    if (is.dev) {
      // 开发模式：从项目根目录获取（支持两个位置）
      const devPath1 = join(process.cwd(), 'resources/tray-icon.png')
      const devPath2 = join(process.cwd(), 'build/tray-icon.png')

      // 尝试resources目录，如果不存在则使用build目录
      if (existsSync(devPath1)) {
        trayIconPath = devPath1
      } else {
        trayIconPath = devPath2
      }
    } else {
      // 构建模式：使用app.asar.unpacked/resources目录
      trayIconPath = join(process.resourcesPath, 'app.asar.unpacked', 'resources', 'tray-icon.png')
    }

    console.log('🔍 托盘图标路径:', trayIconPath)

    // 创建托盘图标（macOS模板图标）
    let trayIcon = nativeImage.createFromPath(trayIconPath)

    // 确保图标尺寸适合托盘显示（16x16为标准）
    if (trayIcon.getSize().width > 16 || trayIcon.getSize().height > 16) {
      trayIcon = trayIcon.resize({ width: 16, height: 16 })
    }

    if (process.platform === 'darwin') {
      trayIcon.setTemplateImage(true) // 在macOS上设置为模板图标
    }

    // 创建托盘实例
    tray = new Tray(trayIcon)

    // 设置托盘提示文本
    const shortcutText = process.platform === 'darwin' ? '⌘⇧X or ⌥Space' : 'Ctrl+Shift+X'
    const speakInputShortcutText = process.platform === 'darwin' ? '⌘⇧C' : 'Ctrl+Shift+C'
    const speakOutputShortcutText = process.platform === 'darwin' ? '⌘⇧V' : 'Ctrl+Shift+V'
    tray.setToolTip(
      `FloatQuickTrans - Show/Hide: ${shortcutText}, Speak input: ${speakInputShortcutText}, Speak output: ${speakOutputShortcutText}`
    )

    // 创建托盘右键菜单
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'About FloatQuickTrans',
        click: () => {
          shell.openExternal('https://github.com/hughedward/FloatQuickTrans')
        }
      },
      {
        label: 'Version Info',
        click: () => {
          const version = app.getVersion()
          dialog.showMessageBox({
            type: 'info',
            title: 'About FloatQuickTrans',
            message: 'FloatQuickTrans',
            detail: `Version: ${version}\nAuthor: Hugh Edward\nHomepage: https://github.com/hughedward/FloatQuickTrans\n\nProfessional Floating AI Translation Tool\nReal-time streaming translation • Multi-window support • Text-to-speech • Always on top`,
            buttons: ['OK']
          })
        }
      },
      {
        type: 'separator'
      },
      {
        label: 'Quit',
        click: () => {
          app.quit()
        }
      }
    ])

    // 设置托盘右键菜单
    tray.setContextMenu(contextMenu)

    // 托盘图标单击事件：切换窗口显示/隐藏
    tray.on('click', () => {
      if (hasVisibleWindow()) {
        hideAllWindows()
      } else {
        showAllWindows()
      }
    })

    // macOS：双击托盘图标显示窗口
    tray.on('double-click', () => {
      showAllWindows()
    })

    console.log('✅ 系统托盘创建成功')
  } catch (error) {
    console.error('❌ 创建托盘失败:', error)
  }
}

// 显示所有窗口
function showAllWindows(): void {
  windowManager.getAllWindows().forEach(window => {
    if (window.isMinimized()) {
      window.restore()
    }
    window.show()

    // 确保超级悬浮设置
    if (isAlwaysOnTop) {
      window.setAlwaysOnTop(true, 'floating')
    }
  })

  // 聚焦第一个窗口
  const firstWindow = windowManager.getFirstWindow()
  if (firstWindow) {
    firstWindow.focus()
  }
}

// 隐藏所有窗口
function hideAllWindows(): void {
  windowManager.getAllWindows().forEach(window => {
    window.hide()
  })
}

// 检查是否有任何窗口可见
function hasVisibleWindow(): boolean {
  return windowManager.getAllWindows().some(window => window.isVisible())
}

// 切换超级悬浮模式
// function toggleAlwaysOnTop(): void {
//   const firstWindow = windowManager.getFirstWindow()
//   if (firstWindow) {
//     isAlwaysOnTop = !isAlwaysOnTop

//     // 应用到所有窗口
//     windowManager.getAllWindows().forEach(window => {
//       if (isAlwaysOnTop) {
//         window.setAlwaysOnTop(true, 'floating')
//         window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
//       } else {
//         window.setAlwaysOnTop(false)
//         window.setVisibleOnAllWorkspaces(false)
//       }
//     })

//     // 更新托盘菜单
//     updateTrayMenu()
//   }
// }

// 更新托盘菜单
// function updateTrayMenu(): void {
//   if (tray) {
//     const contextMenu = Menu.buildFromTemplate([
//       {
//         label: 'About FloatQuickTrans',
//         click: () => {
//           shell.openExternal('https://github.com/hughedward/FloatQuickTrans')
//         }
//       },
//       {
//         label: 'Version Info',
//         click: () => {
//           const version = app.getVersion()
//           dialog.showMessageBox({
//             type: 'info',
//             title: 'About FloatQuickTrans',
//             message: 'FloatQuickTrans',
//             detail: `Version: ${version}\nAuthor: Hugh Edward\nHomepage: https://github.com/hughedward/FloatQuickTrans\n\nProfessional Floating AI Translation Tool\nReal-time streaming translation • Multi-window support • Text-to-speech • Always on top`,
//             buttons: ['OK']
//           })
//         }
//       },
//       {
//         type: 'separator'
//       },
//       {
//         label: 'Quit',
//         click: () => {
//           app.quit()
//         }
//       }
//     ])

//     tray.setContextMenu(contextMenu)
//   }
// }

// 注册全局快捷键
function registerGlobalShortcuts(): void {
  try {
    // ⌘ + ⇧ + X / Ctrl + Shift + X - 显示/隐藏翻译窗口
    const toggleShortcut = process.platform === 'darwin' ? 'Command+Shift+X' : 'Ctrl+Shift+X'

    const registered = globalShortcut.register(toggleShortcut, () => {
      console.log('🎯 全局快捷键触发:', toggleShortcut)

      if (windowManager.getWindowCount() > 0) {
        if (hasVisibleWindow()) {
          // 有窗口可见：隐藏所有窗口
          console.log('🔽 隐藏所有窗口')
          hideAllWindows()
        } else {
          // 所有窗口都隐藏：显示所有窗口
          console.log('🔼 显示所有窗口')
          showAllWindows()
        }
      }
    })

    // ⌘ + ⇧ + C / Ctrl + Shift + C - 朗读输入框
    const speakInputShortcut = process.platform === 'darwin' ? 'Command+Shift+C' : 'Ctrl+Shift+C'
    const speakInputRegistered = globalShortcut.register(speakInputShortcut, () => {
      const firstWindow = windowManager.getFirstWindow()
      if (firstWindow) {
        firstWindow.webContents.send('trigger-speak-input')
      }
    })

    // ⌘ + ⇧ + V / Ctrl + Shift + V - 朗读输出框
    const speakOutputShortcut = process.platform === 'darwin' ? 'Command+Shift+V' : 'Ctrl+Shift+V'
    const speakOutputRegistered = globalShortcut.register(speakOutputShortcut, () => {
      const firstWindow = windowManager.getFirstWindow()
      if (firstWindow) {
        firstWindow.webContents.send('trigger-speak-output')
      }
    })

    if (registered) {
      console.log(`✅ 全局快捷键注册成功: ${toggleShortcut}`)
    } else {
      console.error(`❌ 全局快捷键注册失败: ${toggleShortcut}`)
    }

    if (speakInputRegistered) {
      console.log(`✅ 输入框发音快捷键注册成功: ${speakInputShortcut}`)
    } else {
      console.error(`❌ 输入框发音快捷键注册失败: ${speakInputShortcut}`)
    }

    if (speakOutputRegistered) {
      console.log(`✅ 输出框发音快捷键注册成功: ${speakOutputShortcut}`)
    } else {
      console.error(`❌ 输出框发音快捷键注册失败: ${speakOutputShortcut}`)
    }

    // 可选：添加第二个快捷键 Option+Space (macOS专用)
    if (process.platform === 'darwin') {
      const altShortcut = 'Option+Space'
      const altRegistered = globalShortcut.register(altShortcut, () => {
        console.log('🎯 备用快捷键触发:', altShortcut)

        if (windowManager.getWindowCount() > 0) {
          if (hasVisibleWindow()) {
            hideAllWindows()
          } else {
            showAllWindows()
          }
        }
      })

      if (altRegistered) {
        console.log(`✅ 备用快捷键注册成功: ${altShortcut}`)
      } else {
        console.warn(`⚠️ 备用快捷键注册失败: ${altShortcut} (可能被其他应用占用)`)
      }
    }
  } catch (error) {
    console.error('❌ 注册全局快捷键时出错:', error)
  }
}

// 添加 IPC 处理程序用于动态切换超级悬浮模式
let isAlwaysOnTop = true

ipcMain.handle('toggle-always-on-top', () => {
  const windows = BrowserWindow.getAllWindows()
  if (windows.length > 0) {
    const mainWindow = windows[0]
    isAlwaysOnTop = !isAlwaysOnTop

    if (isAlwaysOnTop) {
      mainWindow.setAlwaysOnTop(true, 'floating') // 🏷️ 浮动级别，不遮挡输入法
      mainWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })
    } else {
      mainWindow.setAlwaysOnTop(false)
      mainWindow.setVisibleOnAllWorkspaces(false)
    }

    return {
      success: true,
      isAlwaysOnTop,
      message: isAlwaysOnTop ? '🚀 超级悬浮已启用！' : '📌 普通置顶模式'
    }
  }
  return { success: false, message: '❌ 窗口未找到' }
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // 如果是便携版，设置用户数据存储路径
  if (process.env.PORTABLE_EXECUTABLE_DIR) {
    app.setPath('userData', path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'user-data'))
  }
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron.quick-trans')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC test
  ipcMain.on('ping', () => console.log('pong'))

  createWindow()
  createTray()
  registerGlobalShortcuts()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (windowManager.getWindowCount() === 0) createWindow()
  })
})

// 修改退出行为：有托盘时，窗口关闭不退出应用
app.on('window-all-closed', () => {
  // 不自动退出应用，让用户通过托盘菜单退出
  // 应用会在后台运行，通过托盘图标控制
})

// 确保托盘图标和全局快捷键在应用退出时被清理
app.on('before-quit', () => {
  // 标记应用正在退出
  isQuitting = true

  // 清理托盘图标
  if (tray) {
    tray.destroy()
    tray = null
  }

  // 注销所有全局快捷键
  globalShortcut.unregisterAll()
  console.log('🧹 已清理全局快捷键')
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
