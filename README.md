![Python](https://img.shields.io/badge/Python-3670A0?&logo=python&logoColor=ffdd54)
![Matplotlib](https://img.shields.io/badge/Ollama-%23ffffff.svg?&)
![Next JS](https://img.shields.io/badge/Next-black?&logo=next.js&logoColor=white)
![Maintenance](https://img.shields.io/badge/Maintenance-Yes-green)
[![MIT license](https://img.shields.io/badge/License-MIT-green)](LICENSE)
![Build](https://img.shields.io/badge/Build-Passing-green)

<div align="center">
  <h3>
    The Assistant
  </h3>
  <p>
    Gemma 3: 4B Powered Offline Assistant built with Next.js and Ollama.
  </p>
</div>

### Project Overview
<p align="justify">
  The Assistant is a fully local assistant designed to help you without sending data to the cloud.  
  It connects a Next.js front-end with that streams responses from a locally-hosted Ollama LLM.
</p>

### Installation
Pull Gemma 3: 4B using `ollama`:
```bash
ollama pull gemma3:4b
```
Inside the folder, run:
```bash
ollama create the-assistant-gemma3-4b -f Modelfile
```
Front-End Installation:
```bash
npm install
```

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

### Getting Started

First, start the model:
```bash
ollama run the-assistant-gemma3-4b
```

Last, run the front-end development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

### Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

### Deploy On Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

### License
<p align="justify">
This project is licensed under the MIT License. This means you are free to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software. The full text of the license is available in the <a href="https://github.com/rahfianugerah/the-assistant-gemma3-4b/blob/main/LICENSE">LICENSE</a> file. By using this project, you agree to include the license notice and disclaimers in all copies or substantial portions of the Software. For more details on the terms and conditions of the MIT License, please refer to the license file.
</p>

### Author
GitHub: [@rahfianugerah](https://www.github.com/rahfianugerah)
