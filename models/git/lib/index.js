'use strict';

const fs = require('fs')
const path = require('path')
const SimpleGit = require('simple-git')
const fse = require('fs-extra')
const userHome = require('user-home')
const inquirer = require('inquirer')
const terminalLink = require('terminal-link')
const log = require('@lwd-cli/log')
const { readFile, writeFile } = require('@lwd-cli/utils');
const Github = require('./Github');
const Gitee = require('./Gitee');

const DEFAULT_CLI_HOME = '.imooc-cli-dev'
const GIT_ROOT_DIR = '.git'
const GIT_SERVER_FILE = '.git_server'
const GIT_TOKEN_FILE = '.git_token'
const GIT_OWN_FILE = '.git_own'
const GIT_LOGIN_FILE = '.git_login'

const GITHUB = 'github'
const GITEE = 'gitee'
const REPO_OWNER_USER = 'user'
const REPO_OWNER_ORG = 'org'

const GIT_SERVER_TYPE = [{
    name: 'Github',
    value: GITHUB
}, {
    name: 'Gitee',
    value: GITEE
}]

const GIT_OWN_TYPE = [{
    name: '个人',
    value: REPO_OWNER_USER
}, {
    name: '组织',
    value: REPO_OWNER_ORG
}]

const GIT_OWN_TYPE_ONLY = [{
    name: '个人',
    value: REPO_OWNER_USER
}]

class Git {
    constructor({ name, version, dir }, {
        refreshServer = false,
        refreshToken = false,
        refreshOwner = false
    }) {
        this.name = name // 项目名称
        this.version = version // 项目版本
        this.dir = dir // 源码目录
        this.git = SimpleGit(dir) // SimpleGit实例
        this.gitServer = null // GitServer实例
        this.homePath = null // 本地缓存目录
        this.user = null // 用户信息
        this.orgs = null // 用户所属组织列表
        this.owner = null // 远程仓库类型
        this.login = null // 远程仓库登录名
        this.refreshServer = refreshServer // 是否强制刷新远程仓库
        this.refreshToken = refreshToken // 是否强化刷新远程仓库token
        this.refreshOwner = refreshOwner // 是否强化刷新远程仓库类型
    }

    async prepare() {
        // 检查缓存主目录
        this.checkHomePath()
        // 检查用户远程仓库类型
        await this.checkGitServer()
        // 获取远程仓库token
        await this.checkGitToken()
        // 获取远程仓库用户和组织信息
        await this.getUserAndOrgs()
        // 确认远程仓库类型
        await this.checkGitOwner()
    }

    checkHomePath() {
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

    async checkGitServer() {
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
        if (!this.gitServer) {
            throw new Error('GitServer初始化失败！')
        }
    }

    async checkGitToken() {
        const tokenpath = this.createPath(GIT_TOKEN_FILE)
        let token = readFile(tokenpath)
        if (!token || this.refreshToken) {
            log.warn(this.gitServer.type + 'token未生成', '请先生存' + this.gitServer.type + 'token，'
                + terminalLink('链接', this.gitServer.getTokenHelpUrl()))
            token = (await inquirer.prompt({
                type: 'password',
                name: 'token',
                message: '请将token复制到这里',
                default: ''
            })).token;
            writeFile(tokenPath, token)
            log.success('token写入成功', `${token} -> ${tokenPath}`)
        } else {
            log.success('token获取成功', tokenPath)
        }
        this.token = token
        this.gitServer.setToken(token)
    }

    async getUserAndOrgs() {
        this.user = await this.gitServer.getUser()
        if (!this.user) {
            throw new Error('用户信息获取失败！')
        }
        log.verbose('user', this.user)
        this.orgs = await this.gitServer.getOrg(this.user.login)
        if (!this.orgs) {
            throw new Error('组织信息获取失败！')
        }
        log.verbose('orgs', this.orgs)
        log.success(this.gitServer.type + '用户和组织信息获取成功')
    }

    async checkGitOwner() {
        const ownerPath = this.createPath(GIT_OWN_FILE)
        const loginPath = this.createPath(GIT_LOGIN_FILE)
        let owner = readFile(ownerPath)
        let login = readFile(loginPath)
        if (!owner || !login || this.refreshOwner) {
            owner = await (inquirer.prompt({
                type: 'list',
                name: 'owner',
                message: '请选择远程仓库类型',
                default: REPO_OWNER_USER,
                choices: this.orgs.length > 0 ? GIT_OWN_TYPE : GIT_OWN_TYPE_ONLY,
            })).owner
            if (owner === REPO_OWNER_USER) {
                login = this.user.login
            } else {
                login = (await inquirer.prompt({
                    type: 'list',
                    name: 'login',
                    message: '请选择',
                    choices: this.orgs.map(item => ({
                        name: item.login,
                        value: item.login
                    }))
                })).login
            }
            writeFile(ownerPath, owner)
            writeFile(loginPath, login)
            log.success('owner写入成功', `${owner} -> ${ownerPath}`)
            log.success('login写入成功', `${login} -> ${loginPath}`)
        } else {
            log.success('owner获取成功', owner)
            log.success('login获取成功', login)
        }
        this.owner = owner
        this.login = login
    }

    createGitServer(gitServer) {
        const _gitServer = gitServer.trim()
        if (_gitServer === GITHUB) {
            return new Github()
        } else if (_gitServer === GITEE) {
            return new Gitee()
        }
        return null
    }

    createPath(file) {
        const rootDir = path.resolve(this.homePath, GIT_ROOT_DIR)
        const filePath = path.resolve(rootDir, file)
        fse.ensureDirSync(rootDir)
        return filePath
    }

    init() {
        console.log('init')
    }
}

module.exports = Git;
