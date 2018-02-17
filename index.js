const electron = require('electron');
const url = require('url');
const path = require('path');
const YoutubeNode = require('youtube-node');
const youtube = new YoutubeNode();
const {spawn} = require('child_process');
const helper = require('./lib/helpers');

const youtubeDL = path.join(__dirname, 'bin', process.platform, 'youtube-dl');
const ffmpeg = path.join(__dirname, 'bin', process.platform, 'ffmpeg');

const {app, BrowserWindow, Menu, ipcMain} = electron;

let mainWindow;

app.on('ready', function () {
    youtube.setKey("AIzaSyAyU7eF3081OEPYYqTq0UXp9h0CqnuN7uc");

    let _chmodCommand = '';
    let _chmodParams = [];

    switch (process.platform) {
        case 'win32':
            _chmodCommand = ''; // TODO
            _chmodParams = []; // TODO
            break;
        case 'darwin':
        default:
            _chmodCommand = 'chmod';
            _chmodParams = ['-R', '777', path.join(__dirname, 'bin', 'darwin')];
            break;
    }

    mainWindow = new BrowserWindow({
        backgroundColor: '#333333',
        width: 1000,
        height: 600,
        minWidth: 1000,
        minHeight: 600,
        maxWidth: 1000,
        maxHeight: 600,
        icon: path.join(__dirname, 'img/mac.icon.icns'),
        show: false,
        center: true
    });

    mainWindow.once('ready-to-show', () => {
        mainWindow.show()
    });

    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'main.html'),
        protocol: 'file:',
        slashes: true
    }));

    // mainWindow.openDevTools();

    let execPermissions = spawn(_chmodCommand, _chmodParams);
    execPermissions.stderr.on('data', function () {
        mainWindow.webContents.send('status', {
            text: 'Erro! Permissão de execução não pode ser concedida!',
            style: 'error'
        });
    });

    const mainMenu = Menu.buildFromTemplate([
        {
            label: "Application",
            submenu: [
                {label: "About Application", selector: "orderFrontStandardAboutPanel:"},
                {type: "separator"},
                {
                    label: "Quit", accelerator: "Command+Q", click: function () {
                    app.quit();
                }
                }
            ]
        }, {
            label: "Edit",
            submenu: [
                {label: "Undo", accelerator: "CmdOrCtrl+Z", selector: "undo:"},
                {label: "Redo", accelerator: "Shift+CmdOrCtrl+Z", selector: "redo:"},
                {type: "separator"},
                {label: "Cut", accelerator: "CmdOrCtrl+X", selector: "cut:"},
                {label: "Copy", accelerator: "CmdOrCtrl+C", selector: "copy:"},
                {label: "Paste", accelerator: "CmdOrCtrl+V", selector: "paste:"},
                {label: "Select All", accelerator: "CmdOrCtrl+A", selector: "selectAll:"}
            ]
        }
    ]);

    Menu.setApplicationMenu(mainMenu);

});

ipcMain.on('video:get', function (ev, videoSearchInput) {
    let id = helper.getYoutubeVideoId(videoSearchInput);

    mainWindow.webContents.send('video:presets:clear');

    if (id !== false) {
        mainWindow.webContents.send('status', 'Obtendo informações do ID do vídeo "' + id + '"');

        youtube.getById(id, function (error, result) {
            var video = result.items[0].snippet;

            let videoDATA = spawn(youtubeDL, [
                id, '--skip-download', '--no-progress', '--no-warnings', '--dump-json'
            ]);

            let _DATA = {};

            videoDATA.stdout.on('data', function (data) {
                let str = data.toString();
            });

            videoDATA.on('close', function (code) {
                console.log(JSON.stringify(_DATA, null, 2));
                mainWindow.webContents.send('video:ready', {
                    video: video,
                    id: id,
                    thumbnail: "https://i.ytimg.com/vi/" + id + "/hqdefault.jpg",
                    duration: helper.convertDuration(result.items[0].contentDetails.duration),
                    statistics: {
                        views: helper.numberFormat(result.items[0].statistics.viewCount, 0, '', '.'),
                        likes: helper.numberFormat(result.items[0].statistics.likeCount, 0, '', '.'),
                        disLikes: helper.numberFormat(result.items[0].statistics.dislikeCount, 0, '', '.'),
                    },
                    contentDetails: result.items[0].contentDetails,
                    data: _DATA
                });

                mainWindow.webContents.send('status', '');
            });

        });


    } else {

        mainWindow.webContents.send('status', '<i class="fa fa-fw fa-refresh fa-spin"></i> Pesquisando por vídeos...');

        youtube.search(videoSearchInput, 20, function (error, result) {
            let parsedResults = [];
            console.log(JSON.stringify(result, null, 2));

            for (let i = 0; i < result.items.length; i++) {
                let video = result.items[i].snippet;

                parsedResults.push({
                    video: video,
                    id: result.items[i].id.videoId,
                    thumbnail: "https://i.ytimg.com/vi/" + result.items[i].id.videoId + "/hqdefault.jpg",
                    // duration: helper.convertDuration(result.items[i].contentDetails.duration),
                    // statistics: {
                    //     views: helper.numberFormat(result.items[i].statistics.viewCount, 0, '', '.'),
                    //     likes: helper.numberFormat(result.items[i].statistics.likeCount, 0, '', '.'),
                    //     disLikes: helper.numberFormat(result.items[i].statistics.dislikeCount, 0, '', '.'),
                    // },
                    // contentDetails: result.items[i].contentDetails,
                });
            }

            mainWindow.webContents.send('video:search:result', parsedResults);
        });

    }
});

ipcMain.on('video:download', function (ev, data) {
    mainWindow.webContents.send('status', '<i class="fa fa-fw fa-refresh fa-spin"></i> Preparando para baixar...');

    let id = data.videoId;
    let profile = data.profile;
    // let saveTo = data.saveTo;
    let saveTo = app.getPath('desktop');
    let videoDestinationFile = undefined;

    let profileFile = path.join(__dirname, 'youtube-dl-profile', profile);

    let downloadVideo = spawn(youtubeDL, [
        '--ffmpeg-location', ffmpeg,
        id,
        '--prefer-ffmpeg',
        '--config-location', profileFile,
        '--output', path.join(saveTo, '%(title)s.%(ext)s'),
        '--restrict-filenames',
        '--abort-on-error',
        '--no-color',
        '--metadata-from-title', '%(artist)s - %(title)s',
        '--add-metadata',
    ]);

    console.log(downloadVideo);

    downloadVideo.stdout.on('data', function (data) {
        console.log(data.toString());

        let parsed = data.toString();
        parsed = parsed.replace('[youtube] ' + id + ': ', ' <i class="fa fa-fw fa-youtube-play"></i> ');
        parsed = parsed.replace('[download]', ' <i class="fa fa-fw fa-cloud-download"></i> ');
        parsed = parsed.replace('[ffmpeg]', ' <span style="font-weight: bold !important; color:white !important;"><i class="fa fa-fw fa-cog fa-spin "></i> Convertendo arquivo:</span> <i class="fa fa-fw fa-file-video-o"></i> ');

        if (data.toString().startsWith('[ffmpeg] Destination: ')) {
            videoDestinationFile = data.toString().replace('[ffmpeg] Destination: ', '');
        }

        mainWindow.webContents.send('status', {
            text: parsed,
            style: 'warning'
        });
    });

    downloadVideo.on('exit', function (code) {
        if (code === 0) {
            mainWindow.webContents.send('status', {
                text: '<i class="fa fa-fw fa-check-circle"></i> O download do vídeo terminou!',
                style: 'success'
            });

            mainWindow.webContents.send('video:download-complete', {
                destinationFile: videoDestinationFile,
                id: id
            });
        } else {
            mainWindow.webContents.send('status', {
                text: 'Ocorreu um problema ao tentar baixar o conteudo!',
                style: 'danger'
            });
        }
    });
});