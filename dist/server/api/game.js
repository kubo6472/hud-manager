"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = exports.getSteamPath = exports.getLatestData = exports.createCFGs = exports.checkCFGs = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const steam_game_path_1 = require("steam-game-path");
const config_1 = require("./config");
const socket_1 = require("../socket");
const child_process_1 = require("child_process");
const electron_1 = require("../../electron");
function createCFG(customRadar, customKillfeed, afx, port, autoexec = true) {
    let cfg = `cl_draw_only_deathnotices 1`;
    let file = 'hud';
    if (!customRadar) {
        cfg += `\ncl_drawhud_force_radar 1`;
    }
    else {
        cfg += `\ncl_drawhud_force_radar 0`;
        file += '_radar';
    }
    if (customKillfeed) {
        file += '_killfeed';
        cfg += `\ncl_drawhud_force_deathnotices -1`;
        cfg += `\nmirv_pgl url "ws://localhost:${port}/socket.io/?EIO=3&transport=websocket"`;
        cfg += `\nmirv_pgl start`;
    }
    if (afx) {
        file += '_interop';
        cfg = 'afx_interop connect 1';
        cfg += `\nexec ${createCFG(customRadar, customKillfeed, false, port).file}`;
    }
    file += '.cfg';
    if (!autoexec) {
        file = '';
    }
    return { cfg, file };
}
function exists(file) {
    try {
        return fs_1.default.existsSync(file);
    }
    catch {
        return false;
    }
}
function isCorrect(cfg) {
    try {
        const GamePath = steam_game_path_1.getGamePath(730);
        if (!GamePath || !GamePath.game || !GamePath.game.path) {
            return false;
        }
        const file = cfg.file;
        const cfgDir = path_1.default.join(GamePath.game.path, 'csgo', 'cfg');
        return fs_1.default.readFileSync(path_1.default.join(cfgDir, file), 'UTF-8') === cfg.cfg;
    }
    catch {
        return false;
    }
}
exports.checkCFGs = async (req, res) => {
    const config = await config_1.loadConfig();
    const SteamGamePath = steam_game_path_1.getGamePath(730);
    const gamePath = SteamGamePath?.game?.path;
    if (!config || !gamePath) {
        return res.json({ success: false, message: "Game path couldn't be found", accessible: false });
    }
    const switcher = [true, false];
    const cfgs = [];
    /*const afx_interop_cfg: CFG = {
        cfg: 'afx_interop connect 1',
        file: 'hud_interop.cfg'
    }
    cfgs.push(afx_interop_cfg);*/
    switcher.forEach(interop => {
        switcher.forEach(radar => {
            switcher.forEach(killfeed => {
                cfgs.push(createCFG(radar, killfeed, interop, config.port));
            });
        });
    });
    const files = cfgs.map(cfg => cfg.file);
    if (!files.map(file => path_1.default.join(gamePath, 'csgo', 'cfg', file)).every(exists)) {
        return res.json({ success: false, message: 'Files are missing', accessible: true });
    }
    if (!cfgs.every(isCorrect)) {
        return res.json({ success: false, message: 'CFGs is incorrect', accessible: true });
    }
    return res.json({ success: true });
};
exports.createCFGs = async (_req, res) => {
    const config = await config_1.loadConfig();
    let GamePath;
    try {
        GamePath = steam_game_path_1.getGamePath(730);
    }
    catch {
        return res.json({ success: false, message: 'Unexpected error occured' });
    }
    if (!GamePath || !GamePath.game || !GamePath.game.path) {
        return res.json({ success: false, message: 'Unexpected error occured' });
    }
    const cfgDir = path_1.default.join(GamePath.game.path, 'csgo', 'cfg');
    try {
        const switcher = [true, false];
        const cfgs = [];
        /*const afx_interop_cfg: CFG = {
            cfg: 'afx_interop connect 1',
            file: 'hud_interop.cfg'
        }
        cfgs.push(afx_interop_cfg);*/
        switcher.forEach(interop => {
            switcher.forEach(radar => {
                switcher.forEach(killfeed => {
                    cfgs.push(createCFG(radar, killfeed, interop, config.port));
                });
            });
        });
        for (const cfg of cfgs) {
            const cfgPath = path_1.default.join(cfgDir, cfg.file);
            if (fs_1.default.existsSync(cfgPath)) {
                fs_1.default.unlinkSync(cfgPath);
            }
            fs_1.default.writeFileSync(cfgPath, cfg.cfg, 'UTF-8');
        }
        return res.json({ success: true, message: 'Configs were successfully saved' });
    }
    catch {
        return res.json({ success: false, message: 'Unexpected error occured' });
    }
};
exports.getLatestData = async (_req, res) => {
    return res.json(socket_1.GSI.last || {});
};
exports.getSteamPath = async (_req, res) => {
    try {
        const GamePath = steam_game_path_1.getGamePath(730);
        if (!GamePath || !GamePath.steam || !GamePath.steam.path) {
            return res.status(404).json({ success: false });
        }
        return res.json({ success: true, steamPath: path_1.default.join(GamePath.steam.path, 'Steam.exe') });
    }
    catch {
        return res.status(404).json({ success: false });
    }
};
exports.run = async (req, res) => {
    const config = await config_1.loadConfig();
    if (!config) {
        return res.sendStatus(422);
    }
    const cfgData = req.body;
    const cfg = createCFG(cfgData.radar, cfgData.killfeed, cfgData.afx, config.port, cfgData.autoexec);
    const exec = cfg.file ? `+exec ${cfg.file}` : '';
    let GamePath;
    try {
        GamePath = steam_game_path_1.getGamePath(730);
    }
    catch {
        return res.sendStatus(404);
    }
    if (!GamePath || !GamePath.steam || !GamePath.steam.path || !GamePath.game || !GamePath.game.path) {
        return res.sendStatus(404);
    }
    const HLAEPath = config.hlaePath;
    const GameExePath = path_1.default.join(GamePath.game.path, 'csgo.exe');
    const isHLAE = cfgData.killfeed || cfgData.afx;
    const exePath = isHLAE ? HLAEPath : path_1.default.join(GamePath.steam.path, 'Steam.exe');
    if ((isHLAE && (!HLAEPath || !fs_1.default.existsSync(HLAEPath))) ||
        (cfgData.afx && (!config.afxCEFHudInteropPath || !fs_1.default.existsSync(config.afxCEFHudInteropPath)))) {
        return res.sendStatus(404);
    }
    const args = [];
    const afxURL = `http://localhost:${config.port}/hlae.html`;
    if (!isHLAE) {
        args.push('-applaunch 730');
        if (exec) {
            args.push(exec);
        }
    }
    else {
        args.push('-csgoLauncher', '-noGui', '-autoStart', `-csgoExe "${GameExePath}"`);
        if (cfgData.afx) {
            if (exec) {
                args.push(`-customLaunchOptions "-afxInteropLight ${exec}"`);
            }
            else {
                args.push(`-customLaunchOptions "-afxInteropLight"`);
            }
        }
        else {
            args.push(`-customLaunchOptions "${exec}"`);
        }
    }
    try {
        const steam = child_process_1.spawn(`"${exePath}"`, args, { detached: true, shell: true, stdio: 'ignore' });
        steam.unref();
        if (cfgData.afx && !electron_1.AFXInterop.process) {
            const process = child_process_1.spawn(`${config.afxCEFHudInteropPath}`, [`--url=${afxURL}`], { stdio: 'ignore' });
            electron_1.AFXInterop.process = process;
        }
    }
    catch (e) {
        return res.sendStatus(500);
    }
    return res.sendStatus(200);
};
