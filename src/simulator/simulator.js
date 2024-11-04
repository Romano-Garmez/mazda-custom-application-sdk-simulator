/**
 * Custom Applications SDK for Mazda Connect Infotainment System
 *
 * A mini framework that allows to write custom applications for the Mazda Connect Infotainment System
 * that includes an easy to use abstraction layer to the JCI system.
 *
 * Written by Andreas Schwarz (http://github.com/flyandi/mazda-custom-applications-sdk)
 * Copyright (c) 2016. All rights reserved.
 *
 * WARNING: The installation of this application requires modifications to your Mazda Connect system.
 * If you don't feel comfortable performing these changes, please do not attempt to install this. You might
 * be ending up with an unusuable system that requires reset by your Dealer. You were warned!
 *
 * This program is free software: you can redistribute it and/or modify it under the terms of the
 * GNU General Public License as published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even
 * the implied warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public
 * License for more details.
 *
 * You should have received a copy of the GNU General Public License along with this program.
 * If not, see http://www.gnu.org/licenses/
 *
 */

/**
 * Mazda Infotainment Simulator
 */

/**
 * Startup
 */

const fs = require('fs');
const { app, BrowserWindow, Menu, dialog, ipcMain, shell } = require('electron');
const express = require('express');
const path = require('path');
let mainWindow = null;
let mockContent = '';
let mockStyles = '';
let intervalPaused = false;
let intervalId = null;

const APP_NAME = 'Simulator for Mazda Infotainment';

/**
 * (Storage)
 */

/**
 * (app)
 */

// Quit when all windows are closed.
app.on('window-all-closed', function () {

  app.quit(); // close the app if all windows are closed

});


// Get ready for action
app.on('ready', function () {


  // Create the main window
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 755,
    minWidth: 1280,
    minHeight: 755,
    maxWidth: 1280,
    title: APP_NAME,
    resizable: true,
    center: true,
    webPreferences: {
      webSecurity: false,
    },
    shown: false,
  });

  // and load the interface
  mainWindow.loadURL('file://' + __dirname + '/interface/interface.html');

  // build menu
  BuildAppMenu();

  // clear the window when it's closed.
  mainWindow.on('closed', function () {
    mainWindow = null;
  });

  // Set up the HTTP server
  const serverApp = express();
  const port = 3000; // You can change the port if needed

  serverApp.use(express.static(path.join(__dirname)));

  // Serve the mock content
  serverApp.get('/mock', (req, res) => {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <style>${mockStyles}</style>
        <link rel="stylesheet" href="/interface/interface.css">
        <link rel="stylesheet" href="/fonts/fonts.css">
      </head>
      <body>
        ${mockContent}
        <script>
          const eventSource = new EventSource('/events');
          eventSource.onmessage = function(event) {
            if (event.data === 'update') {
              location.reload();
            }
          };
        </script>
      </body>
      </html>
    `);
  });

  // Set up SSE endpoint
  serverApp.get('/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    intervalId = setInterval(() => {
      if (!intervalPaused) {
        res.write('data: update\n\n');
      }
    }, 1000);

    req.on('close', () => {
      clearInterval(intervalId);
    });
  });

  serverApp.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
  });

  // Listen for mock content from the renderer process
  ipcMain.on('mock-content', (event, data) => {

    mockContent = data.content;
    mockStyles = data.styles;
  });
});

/**
 * Menu
 */

var BuildAppMenu = function () {

  var appName = APP_NAME;

  var ApplicationMenu = [
    {
      label: 'Simulator',
      submenu: [
        {
          label: 'About ' + appName,
          //role: 'about',
          click: function () {
            dialog.showMessageBox({
              type: 'info',
              title: 'About',
              message: 'Simulator for Custom Application SDK\n\nThis is an alpha release.\n\n(c) 2016 flyandi'
            });
          }
        },
      ],
    },
    {
      label: 'File',
      submenu: [
        /*{
          label: 'Check for Updates',
        },*/
        {
          label: 'Open in External Brower',
          click: function () {
            shell.openExternal('http://localhost:3000/mock');
          }
        },
        {
          label: 'Pause/Resume Browser Refresh',
          click: function () {
            intervalPaused = !intervalPaused;
          }
        },
        {
          type: 'separator'
        },
        {
          label: 'Choose Runtime Location',
          accelerator: 'CmdOrCtrl+L',
          click: function () {
            dialog.showOpenDialog({
              title: 'Choose Runtime Location',
              properties: ['openDirectory']
            }, (result) => {
              if (result && result.length > 0) {
                mainWindow.webContents.send('runtimeLocation', result[0]);
              }
            });
          }
        },
        {
          label: 'Choose Applications Location',
          accelerator: 'CmdOrCtrl+O',
          click: function () {
            dialog.showOpenDialog({
              title: 'Choose Applications Location',
              properties: ['openDirectory']
            }, (result) => {
              if (result && result.length > 0) {
                mainWindow.webContents.send('appsLocation', result[0]);
              }
            });
          }
        },
        {
          type: 'separator'
        },
        {
          label: 'Reload Runtime',
          click: function () {
            mainWindow.webContents.send('reloadRuntimeLocation');
          }

        },
        {
          label: 'Reload Applications',
          accelerator: 'CmdOrCtrl+R',
          click: function () {
            mainWindow.webContents.send('reloadAppsLocation');
          }
        },
        {
          type: 'separator'
        },
        {
          label: 'Quit',
          accelerator: 'Command+Q',
          click: function () {
            app.quit();
          }
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        // {
        //   label: 'Simulator',
        //   type: 'checkbox',
        //   checked: true,
        //   disabled: true,
        // },
        // {
        //   label: 'Showcase',
        //   type: 'checkbox',
        //   disabled: true,
        // },
        // {
        //   type: 'separator'
        // },
        {
          label: 'Application Screenshot',
          accelerator: 'Command+P',
          click: function () {
            mainWindow.capturePage({ x: 0, y: 0, width: 800, height: 480 }, function (image) {

              // get fn
              fn = "casdk-simulator-" + Math.floor(Date.now() / 1000 | 0) + ".png";

              // save image to desktop
              fs.writeFile(app.getPath("desktop") + "/" + fn, image.toPng(), function (err) { });
            });
          }
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        {
          type: 'separator'
        },
        {
          label: 'Toggle Keyboard Shortcuts',
          click: function () {
            mainWindow.webContents.send('toggleKeybShortcuts');
          }
        },
      ]
    },
    {
      label: 'Debug',
      submenu: [
        {
          label: 'Show Development Tools',
          accelerator: 'CmdOrCtrl+A',
          click: function () {
            mainWindow.openDevTools();
          }
        }
      ],
    }
  ];

  // build menu

  menu = Menu.buildFromTemplate(ApplicationMenu);
  Menu.setApplicationMenu(menu);

}

/** EOF **/