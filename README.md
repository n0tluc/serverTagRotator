# 🌀 ServerTagRotator – A Vencord Plugin for Automatic Discord Server Tag Rotation

![Discord](https://img.shields.io/badge/Discord-5865F2?logo=discord&logoColor=white)
![License](https://img.shields.io/badge/License-GPL--3.0--or--later-blue)
![Vencord](https://img.shields.io/badge/Vencord-Plugin-00bcd4)

> Automatically rotates your worn **Discord Server Tag** (clan tag) across multiple servers in custom intervals – fully compatible with Discord’s 2025 API.

---

## ✨ Features

- 🔁 Automatically switch your **Server Tag (Clan Tag)** every few minutes  
- ⚙️ Custom rotation interval (in seconds)  
- 🎲 Optional **random shuffle** of servers  
- 🟢 Only rotate when your Discord status is “Online”  
- 🖱️ Simple settings UI to select your servers  
- 🔐 Uses the **official Discord API endpoint**  
  → `PUT https://discord.com/api/v9/users/@me/clan`

---

## 🧩 Requirements

- [Vencord](https://vencord.dev) (latest build, 2025 or later)
- Node.js 18+  
- PNPM (for building custom plugins)

---

## ⚙️ Installation

### 🔹 Option 1: Manual (Recommended for Developers)

1. Clone or download this repository  
   ```bash
   git clone https://github.com/n0tluc/serverTagRotator.git
   ```

2. Move the plugin folder into your Vencord user plugins directory:
   ```
   Vencord/
   └── src/
       └── userplugins/
           └── serverTagRotator/
               └── index.tsx
   ```

3. Build Vencord with:
   ```bash
   pnpm build
   ```

4. Restart Discord.

5. Go to:
   ```
   User Settings → Vencord → Plugins → Server Tag Rotator
   ```
   Enable the plugin and configure your options.

---

### 🔹 Option 2: Prebuilt ZIP (Drag & Drop)

If you have a prebuilt `serverTagRotator.zip`:

1. Extract it inside your Vencord userplugins folder:
   ```
   Vencord/src/userplugins/
   ```
2. Build and restart Discord:
   ```bash
   pnpm build
   ```

---

## 🧭 Usage Guide

1. Open your Discord **Vencord Settings → Plugins → Server Tag Rotator**  
2. Select which **servers (guilds)** you want to rotate between  
3. Set your desired **interval** (in seconds)  
4. Enable optional features:
   - ✅ Random order (shuffle)
   - ✅ Only rotate when online  
5. Press **“Apply & Restart”**

The plugin will automatically switch your worn server tag every interval.  
You’ll see a small toast message when a new tag is applied.

---

## 🧠 Technical Details

- **Discord API Endpoint:**  
  `PUT https://discord.com/api/v9/users/@me/clan`

- **Payload Example:**
  ```json
  {
    "identity_guild_id": "123456789012345678",
    "identity_enabled": true
  }
  ```

- **Authorization:** Uses the client’s stored user token (via Vencord internals)  
- **Rotation Timer:** Interval-based with optional randomization  
- **UI Framework:** Uses Vencord’s internal `Forms` and React components

---

## 🧰 Example Toast Message

```
Server Tag switched to: My Awesome Server
```

---

## 🚀 Roadmap

- [ ] Option to disable tags periodically (empty interval)
- [ ] Custom toast messages
- [ ] Global pause/resume switch
- [ ] Smart skip when Discord API rate-limits

---

## 🧑‍💻 Contributing

Pull requests and issues are welcome!

1. Fork the repository  
2. Create your feature branch (`git checkout -b feature/awesome-feature`)  
3. Commit your changes (`git commit -m 'Add new feature'`)  
4. Push to the branch (`git push origin feature/awesome-feature`)  
5. Open a Pull Request

---

## 🧾 License

**ServerTagRotator** is licensed under the [GNU GPL v3.0 or later](https://www.gnu.org/licenses/gpl-3.0.html).  
You are free to use, modify, and distribute this project under the same license.

---

## 🧑‍🎤 Credits

- **Author:** [n0tluc](https://github.com/n0tluc)  
- **Plugin System:** [Vencord](https://vencord.dev)  
- **API Research:** Discord API Team & Community

---

### ❤️ Support

If you enjoy this plugin, consider ⭐ starring the repo or sharing it with other Vencord users!  
Feedback and improvement ideas are always welcome.
