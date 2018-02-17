const electron = require('electron');
const path = require('path');
const mustache = require('mustache');
const {ipcRenderer} = electron;

$(document).ready(function () {
    /////////////////////
    let _getVideoButton = $('.get-video-btn');
    let _videoSearchInput = $('.video-search-input');
    let _statusBar = $('.status-bar');
    let _contentContainer = $('.container-content');
    /////////////////////
    let _VIDEO_PRESETS = [];
    /////////////////////

    let changeStatusBarText = function (status) {
        if (!(status instanceof Object)) {
            status = {
                text: status
            };
        }

        let text = _statusBar.find('span');

        text.removeAttr('class');
        if (status.style !== undefined)
            text.addClass('text-' + status.style);

        if (status.text === null || status.text === undefined || status.text.trim() === '')
            status.text = '&nbsp;';

        text.html(status.text);
    };

    let loading = function (show, where = 'content') {
        if (show) {
            $('.loading-' + where).show();
            $('.container-' + where).hide();
        } else {
            $('.loading-' + where).hide();
            $('.container-' + where).show();
        }
    };

    let renderContent = function (view, data, afterRenderCallback) {
        $.get(path.join(__dirname, 'views', view + '.html'), function (templateHtml) {
            var parsedHtml = mustache.render(templateHtml, data);
            _contentContainer.html(parsedHtml);

            if (afterRenderCallback !== undefined)
                afterRenderCallback();
        });
    };

    _getVideoButton.click(function () {
        loading(true);
        ipcRenderer.send('video:get', _videoSearchInput.val());
    });

    ///// Receive status bar status
    ipcRenderer.on('status', function (ev, status) {
        changeStatusBarText(status);
    });

    ipcRenderer.on('video:ready', function (ev, data) {
        loading(true);
        renderContent('video-info', data, function () {
            loading(false);
        });
    });

    ipcRenderer.on('video:presets:clear', function (ev, data) {
        _VIDEO_PRESETS = [];
    });

    ipcRenderer.on('video:presets:add', function (ev, data) {
        _VIDEO_PRESETS.push(data);
        console.log(_VIDEO_PRESETS);
        // $('.video-format').find('.video-advanced-presets').append('<option value="a:' + data.value + '">' + data.option + '</option>');
    });

    ipcRenderer.on('video:search:result', function (ev, data) {
        loading(true);
        renderContent('video-search-result', {items: data}, function () {
            loading(false);
        });
    });

});

function downloadVideo(id, profile) {
    ipcRenderer.send('video:download', {
        videoId: id,
        profile: profile,
        saveTo: '/Users/rodrigobrun/Desktop'
    });
}

function goToDownloadPage(id){
    ipcRenderer.send('video:get', 'https://www.youtube.com/watch?v=' + id);
}