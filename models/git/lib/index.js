'use strict';

const fs = require('fs')
const path = require('path')
const SimpleGit = require('simple-git')
const fse = require('fs-extra')
const userHome = require('user-home')
const log = require('@lwd-cli/log')
const DEFAULT_CLI_HOME = '.imooc-cli-dev';

class Git {
    constructor({ name, version, dir }) {
        this.name = name
        this.version = version
        this.dir = dir
        this.git = SimpleGit(dir)
        this.gitServer = null
    }

    prepare () {
        // 检查缓存主目录
        this.checkHomePath()
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

    init () {
        console.log('init')
    }
}

module.exports = Git;
