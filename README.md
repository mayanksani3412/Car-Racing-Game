# Neon Highway - 2D Car Racing Game

A complete, offline-ready top-down racing game built with HTML5 Canvas, CSS, and vanilla JavaScript. No build step or game framework is required.

## Create and run the project in VS Code

1. In VS Code, choose **File → Open Folder...**, create a folder named `car-racing-game`, and open it.
2. In the Explorer panel, create four files named `index.html`, `style.css`, `script.js`, and `README.md`.
3. Add the corresponding project code to each file and save them in the same folder.
4. Open `index.html` in a browser. For the simplest repeatable workflow, install the VS Code **Live Server** extension, right-click `index.html`, and select **Open with Live Server**.
5. Select **Start Game**.

## Controls

- **Laptop / desktop:** Left and Right arrows or A and D to change lanes; Space to pause or resume.
- **Touchscreen:** Tap the large left/right buttons, or swipe horizontally on the road.
- Avoid the traffic, collect coins, and beat your best distance score. Sound effects can be toggled in the top-right.

Your best score is saved in browser local storage on the device and browser where you play.

## Test on a laptop

Open the page in Chrome, Edge, Firefox, or Safari. Start a game, steer with the keyboard, collect a coin, pause with Space or the pause button, resume, and test the sound toggle. A crash ends the run and shows the current and best scores; **Race Again** starts a fresh run.

## Play on an Android phone

For quick local testing:

1. Connect the phone and computer to the same Wi-Fi network and start the project with VS Code Live Server.
2. If the phone cannot connect, set Live Server's `localhost` setting to `0.0.0.0` in VS Code settings and allow the server through Windows Firewall on private networks.
3. Find the computer's local IPv4 address (run `ipconfig` in PowerShell), then open `http://COMPUTER-IP:5500/` in Chrome on the phone, replacing `COMPUTER-IP` with that address.

Touch buttons and swipe steering are enabled. The road and controls suppress touch gestures that could otherwise scroll the game page. To play from anywhere, publish with GitHub Pages below.

## Publish with GitHub Pages

1. Sign in to GitHub and create a new **public** repository, for example `car-racing-game`.
2. In VS Code, open the project folder and use **Source Control** to initialize a repository, stage the four project files, commit them, and publish/push the branch to your GitHub repository. Alternatively, upload the four files using GitHub's web interface.
3. On GitHub, open the repository's **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select the `main` branch and `/ (root)` folder, then click **Save**.
6. Wait for the Pages deployment to finish. Open the published URL shown on the Pages settings screen; it will look like `https://YOUR-USERNAME.github.io/car-racing-game/`.
7. Open that URL on your Android phone. GitHub Pages serves the same static HTML, CSS, and JavaScript files, so no server-side code is needed.

The game stores no personal data. The only persisted value is the best score in local storage.