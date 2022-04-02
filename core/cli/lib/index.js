'use strict'

module.exports = core
const path = require('path')
const semver = require('semver')
const colors = require('colors/safe')
const userHome = require('user-home')
const pathExists = require('path-exists').sync
const commander = require('commander')
const log = require('@lwd-cli/log')
const exec = require('@lwd-cli/exec')

const constant = require('./const')
const pkg = require('../package.json')

const program = new commander.Command()

async function core () {
  try {
    await prepare()
    registerCommand()
  } catch (e) {
    log.error(e.message)
    if (program.opts().debug) {
      console.log(e)
    }
  }
}

function registerCommand () {
  program
    .name(Object.keys(pkg.bin)[0])
    .usage('<command> [options]')
    .version(pkg.version)
    .option('-d, --debug', '是否开启调试模式', false)
    .option('-tp, --targetPath <targetPath>', '是否指定本地调试文件路径', '')

  program
    .command('init [projectName]')
    .option('-f, --force', '是否强制初始化项目')
    .action(exec)

  // 开启debug模式
  program.on('option:debug', function () {
    if (program.opts().debug) {
      process.env.LOG_LEVEL = 'verbose'
    } else {
      process.env.LOG_LEVEL = 'info'
    }
    log.level = process.env.LOG_LEVEL
  })

  // 指定targetPath
  program.on('option:targetPath', function () {
    process.env.CLI_TARGET_PATH = program.opts().targetPath
  })

  // 未知命令监听
  program.on('command:*', function (obj) {
    const availableCommands = program.commands.map((cmd) => cmd.name())
    console.log(colors.red('未知命令：' + obj[0]))
    if (availableCommands.length > 0) {
      console.log(colors.red('可用命令：' + availableCommands.join(',')))
    }
  })
  if (process.argv.length < 3) {
    program.outputHelp()
    console.log()
  }
  program.parse(process.argv)

  if (program.args && program.args.length < 1) {
    program.outputHelp()
    console.log()
  }
}

async function prepare () {
  checkPkgVersion()
  checkRoot()
  checkUserHome()
  checkEnv()
  await checkGlobalUpdate()
}

// 更新最新版本
async function checkGlobalUpdate () {
  // 获取当前版本
  const currentVersion = pkg.version
  const npmName = pkg.name
  // 调用npm API 获取所有版本号
  const { getNpmSemverVersion } = require('@lwd-cli/get-npm-info')
  const lastVersions = await getNpmSemverVersion(currentVersion, npmName)
  if (lastVersions && semver.gt(lastVersions, currentVersion)) {
    log.warn(
      colors.yellow(
        `请手动更新${npmName}，当前版本：${currentVersion}，最新版本：${lastVersions}更新命令：npm install -g ${npmName}`
      )
    )
  }
}

function checkEnv () {
  const dotenv = require('dotenv')
  const dotenvPath = path.resolve(userHome, '.env')
  if (pathExists(dotenvPath)) {
    dotenv.config({
      path: dotenvPath,
    })
  }
  createDefaultConfig()
}

function createDefaultConfig () {
  const cliConfig = {
    home: userHome,
  }
  if (process.env.CLI_HOME) {
    cliConfig['cliHome'] = path.join(userHome, process.env.CLI_HOME)
  } else {
    cliConfig['cliHome'] = path.join(userHome, constant.DEFAULT_CLI_HOME)
  }
  process.env.CLI_HOME_PATH = cliConfig.cliHome
}

function checkUserHome () {
  if (!userHome || !pathExists(userHome)) {
    throw new Error(colors.red('当前登录用户主目录不存在！'))
  }
}

function checkRoot () {
  const rootCheck = require('root-check')
  rootCheck()
}


function checkPkgVersion () {
  log.info('当前版本', pkg.version)
}
