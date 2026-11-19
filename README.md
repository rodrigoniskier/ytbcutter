# Cortador de Vídeo

Aplicativo minimalista para cortar trechos de vídeo no navegador, sem enviar o arquivo a um servidor.

## Problema, público e resultado

**Problema.** Extrair um trecho de um vídeo costuma exigir um editor pesado ou o envio do arquivo para serviços de terceiros.

**Para quem.** Quem precisa recortar trechos de vídeos próprios, como aulas e apresentações, de forma rápida (por exemplo professores).

**O que entrega.** Define o início e o fim do corte, visualiza o trecho e exporta o resultado para download. Há também uma aba com o player do YouTube para marcar o início e o fim e levar esses tempos ao cortador local.

**Tecnologias.** React, TypeScript, Vite, Tailwind CSS, MediaRecorder API, YouTube IFrame API, GitHub Actions (deploy no GitHub Pages).

**Qualidade e evidências.** O corte local regrava o trecho no navegador com a MediaRecorder API, sem backend. Este repositório não tem testes automatizados. Licença MIT.

## Executar localmente

Requer Node.js.

```bash
npm install
npm run dev
```

## Limitações

- O formato e a qualidade da saída dependem dos codecs que o navegador suporta.
- O corte por regravação não substitui um editor profissional.
- A aba do YouTube serve para marcar tempos; ela não baixa vídeos.
