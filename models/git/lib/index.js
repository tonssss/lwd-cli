'use strict';

const fs = require('fs')
const path = require('path')
const SimpleGit = require('simple-git')
const fse = require('fs-extra')
const userHome = require('user-home')
const inquirer = require('inquirer')
const log = require('@lwd-cli/log')
const { readFile, writeFile } = require('@lwd-cli/utils')

const DEFAULT_CLI_HOME = '.imooc-cli-dev'
const GIT_ROOT_DIR = '.git'
const GIT_SERVER_FILE = '.git_server'
const GITHUB = 'github'
const GITEE = 'gitee'

const GIT_SERVER_TYPE = [{
    name: 'Github',
    value: GITHUB
}, {
    name: 'Gitee',
    value: GITEE
}]

class Git {
    constructor({ name, version, dir }, {
        refreshServer = false,
    }) {
        this.name = name
        this.version = version
        this.dir = dir
        this.git = SimpleGit(dir)
        this.gitServer = null
        this.homePath = null
        this.refreshServer = refreshServer
    }

    async prepare () {
        // 检查缓存主目录
        this.checkHomePath()
        // 检查用户远程仓库类型
        await this.checkGitServer()
    }

    checkHomePath () {
        if (!this.homePath) {
            if (process.env.CLI_HOME_PATH) {
                this.homePath = process.env.CLI_HOME_PATH
            } else {
                this.homePath = path.resolve(userHome, DEFAULT_CLI_HOME)
            }
        }
        log.verbose('home', this.homePath)
        fse.ensureDirSync(this.homePath)
        if (!fs.existsSync(this.homePath)) {
            throw new Error('用户主目录获取失败！')
        }
    }

    async checkGitServer () {
        const gitServerPath = this.createPath(GIT_SERVER_FILE)
        let gitServer = readFile(gitServerPath)
        if (!gitServer || this.refreshServer) {
            gitServer = (await inquirer.prompt({
                type: 'list',
                name: 'gitServer',
                message: '请选择您想要托管的Git平台',
                default: GITHUB,
                choices: GIT_SERVER_TYPE
            })).gitServer;
            writeFile(gitServerPath, gitServer)
            log.success('git server写入成功', `${gitServer} -> ${gitServerPath}`)
        } else {
            log.success('git server获取成功', gitServer)
        }
        this.gitServer = this.createGitServer(gitServer)
    }

    createGitServer (gitServer) {
        
    }

    createPath (file) {
        const rootDir = path.resolve(this.homePath, GIT_ROOT_DIR)
        const filePath = path.resolve(rootDir, file)
        fse.ensureDirSync(rootDir)
        return filePath
    }

    init () {
        console.log('init')
    }
}

module.exports = Git;
