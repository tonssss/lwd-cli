'use strict';

const path = require('path')
const fs = require('fs')
const fse = require('fs-extra')
const Command = require('@lwd-cli/command')
const log = require('@lwd-cli/log')
const Git = require('@lwd-cli/git')

class PublishCommand extends Command {
    init() {
        // 处理参数
        log.verbose('publish', this._argv, this._cmd.opts)
        this.options = {
            refreshServer: this._cmd.opts.refreshServer,
            refreshToken: this._cmd.opts.refreshToken,
            refreshOwner: this._cmd.opts.refreshOwner
        }
    }

    async exec() {
        try {
            const startTime = new Date().getTime()
            // 1.初始化检查
            this.perpare()
            // 2.Git flow 自动化
            const git = new Git(this.projectInfo, this.options)
            await git.prepare(); // 自动化提交准备和代码仓库初始化
            await git.commit(); // 代码自动化提交
            // await git.publish(); // 代码云构建+云发布
            // 3.云构建和云发布
            const endTime = new Date().getTime()
            log.info('本次发布耗时：', Math.floor((endTime - startTime) / 1000) + '秒')
        } catch (e) {
            log.error(e.message)
            if (process.env.LOG_LEVEL === 'verbose') {
                console.log(e)
            }
        }
    }

    perpare() {
        // 1.确认项目是否为npm项目
        const projectPath = process.cwd()
        const pkgPath = path.resolve(projectPath, 'package.json')
        log.verbose('package.json', pkgPath)
        if (!fs.existsSync(pkgPath)) {
            throw new Error('package.json不存在！')
        }
        // 2.确定是否包含name、version、build命令
        const pkg = fse.readJSONSync(pkgPath)
        const { name, version, scripts } = pkg
        log.verbose('package.json', name, version, scripts)
        if (!name || !version || !scripts || !scripts.build) {
            throw new Error('package.json信息不全，请检查是否存在name、version和scripts(需要build命令)')
        }
        this.projectInfo = { name, version, dir: projectPath }
    }
}

function init(argv) {
    return new PublishCommand(argv)
}

module.exports = init
module.exports.PublishCommand = PublishCommand
