
//_____        _____ _  __  _________     _______  ______ ____   ____ _______ 
//|  __ \ /\   / ____| |/ / |__   __\ \   / /  __ \|  ____|  _ \ / __ \__   __|
//| |__) /  \ | |    | ' /     | |   \ \_/ /| |__) | |__  | |_) | |  | | | |   
//|  ___/ /\ \| |    |  <      | |    \   / |  ___/|  __| |  _ <| |  | | | |   
//| |  / ____ \ |____| . \     | |     | |  | |    | |____| |_) | |__| | | |   
//|_| /_/    \_\_____|_|\_\    |_|     |_|  |_|    |______|____/ \____/  |_|   
//                                                                             
                                                                             
const fs = require('fs');
const axios = require('axios');
const qrcode = require('qrcode-terminal');
const { Client, MessageMedia, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const url_start = 'https://typebot.io/api/v1/typebots/atendimento-on/startChat';
const url_session = 'https://typebot.io/api/v1/sessions/';
const logs_conexao = 'logs_conexao.json';
const keywordGatilho = "#iniciar";
const keywordEspera = "#espera";
const keywordSair = "#sair";
const msgSair = "Se precisar de ajuda novamente, basta digitar qualquer coisa.\nEstou sempre por aqui para ajudar. Até logo! 👋🌟";


const packtypebot = new Client({
  authStrategy: new LocalAuth({ clientId: "client-one" }),
  puppeteer: {
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  }
});

const corAmarela = "\x1b[33m";
const corCiano = "\x1b[36m";
const corVerde = "\x1b[32m";
const corVermelha = "\x1b[31m";
const estiloReset = "\x1b[0m";

console.log(`${corAmarela}🤖 Descubra o Poder do Pack Typebot${estiloReset}`);
console.log(`${corCiano}🔗 URL da sessão: ${url_start}${estiloReset}`);
console.log(`${corCiano}🔗 URL do chat: ${url_session}${estiloReset}`);
console.log(`${corCiano}📱 Arquivo JSON das sessões: ${logs_conexao}${estiloReset}`);

packtypebot.on('qr', qr => {
    io.emit('qrCode', qr);
  });
  
  packtypebot.on('ready', () => {
    io.emit('botReady');
    console.log(`${corVerde}🚀 Bot no ar! Conectado e pronto para ação.${estiloReset}`);
  });
  
  packtypebot.initialize();
  
  app.use(express.static(__dirname + '/public'));
  
  app.get('/', (req, res) => {
      res.sendFile(__dirname + '/public/index.html');
  });
  
  server.listen(3000, () => {
      console.log('Servidor web iniciado em http://localhost:3000');
  });

function readJSONFile(nomeArquivo) {
  if (fs.existsSync(nomeArquivo)) {
    const dados = fs.readFileSync(nomeArquivo);
    return JSON.parse(dados);
  } else {
    return [];
  }
}

function writeJSONFile(nomeArquivo, dados) {
  const dadosJSON = JSON.stringify(dados, null, 2);
  fs.writeFileSync(nomeArquivo, dadosJSON);
}

function addObject1(numeroId, sessionid, numero, maxObjects) {
  const dadosAtuais = readJSONFile(logs_conexao);

  const existeNumeroId = dadosAtuais.some(objeto => objeto.numeroId === numeroId);
  if (existeNumeroId) {
    throw new Error(`${corVermelha}🚨 O numeroId já existe no banco de dados.${estiloReset}`);
  }

  const objeto = { numeroId, sessionid, numero};

  if (dadosAtuais.length >= maxObjects) {
    dadosAtuais.shift();
  }

  dadosAtuais.push(objeto);
  writeJSONFile(logs_conexao, dadosAtuais);
}

function readMap1(numeroId) {
  const dadosAtuais = readJSONFile(logs_conexao);
  const objeto = dadosAtuais.find(obj => obj.numeroId === numeroId);
  return objeto;
}

function deleteObject1(numeroId) {
  const dadosAtuais = readJSONFile(logs_conexao);
  const novosDados = dadosAtuais.filter(obj => obj.numeroId !== numeroId);
  writeJSONFile(logs_conexao, novosDados);
}

function existsDB1(numeroId) {
  const dadosAtuais = readJSONFile(logs_conexao);
  return dadosAtuais.some(obj => obj.numeroId === numeroId);
}

function readSessionId1(numeroId) {
  const objeto = readMap1(numeroId);
  return objeto ? objeto.sessionid : undefined;
}

async function createSessionPackTypebot(data) {
  const reqData = {
    isStreamEnabled: true,    
    isOnlyRegistering: true,
    prefilledVariables: {
      number: data.from.split('@')[0],
      name: data.notifyName
    },
  };

  const config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: url_start,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    data: JSON.stringify(reqData),
  };

  try {
    const response = await axios.request(config);
    
    if (!existsDB1(data.from)) {
      addObject1(data.from, response.data.sessionId, data.from.replace(/\D/g, ''), 100);
    }
  } catch (error) {
    console.log(error);
  }
}

async function waitWithDelay(inputString) {
  if (inputString.startsWith(keywordEspera)) {
    const match = inputString.match(/\d+/);
    
    if (match) {
      const delayInSeconds = parseInt(match[0]);
      await new Promise(resolve => setTimeout(resolve, delayInSeconds * 1000));
    } else {
      const defaultDelayInSeconds = 3;
      await new Promise(resolve => setTimeout(resolve, defaultDelayInSeconds * 1000));
    }
  }
}

async function tratarMidia(message) {  
    try {
      let fileUrl = message.content.url;
      let mimetype;
      let filename;
      const attachment = await axios.get(fileUrl, {
        responseType: 'arraybuffer',
      }).then(response => {
        mimetype = response.headers['content-type'];
        filename = fileUrl.split("/").pop();
        return response.data.toString('base64');
      });

      if (attachment) {
        const media = new MessageMedia(mimetype, attachment, filename);
        return media;
      }
    } catch (e) {
      console.error(e);
    }  
}

packtypebot.on('message', async msg => {

  if(keywordGatilho !== "null"){
  if (!existsDB1(msg.from) && msg.from.endsWith('@c.us') && !msg.hasMedia && msg.body === keywordGatilho){
    await createSessionPackTypebot(msg);
   }
  } else {
  if (!existsDB1(msg.from) && msg.from.endsWith('@c.us') && !msg.hasMedia && msg.body !== null){
    await createSessionPackTypebot(msg);
   }
  }

  if (existsDB1(msg.from) && msg.from.endsWith('@c.us') && !msg.hasMedia){
  const chat = await msg.getChat();
  const sessionId = readSessionId1(msg.from);
  const content = msg.body;
  const chaturl = `${url_session}${sessionId}/continueChat`;
  
  const reqData = {
    message: content,
  };

  const config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: chaturl,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    data: JSON.stringify(reqData),
  };

  try {
    const response = await axios.request(config);
    const messages = response.data.messages;    
    for (const message of messages){
      if (message.type === 'text') {
        let formattedText = '';
        for (const richText of message.content.richText) {
          for (const element of richText.children) {
            let text = '';
    
            if (element.text) {
              text = element.text;
            } else if (element.type === 'inline-variable') {              
              text = element.children[0].children[0].text;
            }
    
            if (element.bold) {
              text = `*${text}*`;
            }
            if (element.italic) {
              text = `_${text}_`;
            }
            if (element.underline) {
              text = `~${text}~`;
            }
    
            formattedText += text;
          }
          formattedText += '\n';
        }
    
        formattedText = formattedText.replace(/\n$/, '');
        if (formattedText.startsWith(keywordEspera)) {
          await waitWithDelay(formattedText);
        }
        if (formattedText.startsWith(keywordSair)) {
          if (existsDB1(msg.from)) {
            deleteObject1(msg.from);
            await packtypebot.sendMessage(msg.from, msgSair);
          }
        }
        if (!(formattedText.startsWith(keywordEspera)) && !(formattedText.startsWith(keywordSair))) {
          await chat.sendStateTyping();
          await packtypebot.sendMessage(msg.from, formattedText);
        }
      }
      if (message.type === 'image' || message.type === 'video') {
        try{
          const media = await tratarMidia(message);
          await packtypebot.sendMessage(msg.from, media);
        }catch(e){}
      }
      if (message.type === 'audio') {
        try{
          const media = await tratarMidia(message);
          await chat.sendStateRecording();
          await packtypebot.sendMessage(msg.from, media, {sendAudioAsVoice: true});
        }catch(e){}
      }
    }
  } catch (error) {
    console.log(error);
  }
  
  }  
});

function formatarContato(numero, prefixo) {
  const regex = new RegExp(`^${prefixo}(\\d+)`);
  const match = numero.match(regex);

  if (match && match[1]) {
    const digits = match[1];
    return `55${digits}@c.us`;
  }

  return numero;
}

function getRandomDelay(minDelay, maxDelay) {
  const randomDelay = Math.random() * (maxDelay - minDelay) + minDelay;
  return Math.floor(randomDelay);
}

function extrairNomeArquivo(str, posicao) {
  const partes = str.split(' ');
  if (posicao >= 0 && posicao < partes.length) {
    return partes[posicao];
  }
  return null;
}

function extrairContatos(leadsTopo, leadsFundo, quantidade) {
  if (leadsFundo === null) {
    return leadsTopo.slice(0, quantidade).map(objeto => objeto.numeroId);
  }

  const contatos = leadsTopo
    .filter(contato => !leadsFundo.includes(contato))
    .slice(0, quantidade)
    .map(objeto => objeto.numeroId);
  return contatos;
}

async function obterUltimaMensagem(contato) {
  const chat = await packtypebot.getChatById(contato);
  const mensagens = await chat.fetchMessages({ limit: 1 });

  if (mensagens.length > 0) {
    const ultimaMensagem = mensagens[mensagens.length - 1];
    return ultimaMensagem.body;
  }

  return `${corVermelha}🤷‍♂️ Nenhuma mensagem encontrada${estiloReset}`;
}  

async function escutarGrupos() {
  const chats = await packtypebot.getChats();
  const contatos = [];

  for (let i = 0; i < chats.length; i++) {
    const chat = chats[i];
    if (!chat.isGroup) continue;

    const contato = chat.id._serialized;
    const ultimaMensagem = await obterUltimaMensagem(contato);

    contatos.push({ contato, ultimaMensagem });
  }

  return contatos;
}

async function extrairGrupo(grupoId) {
  const chat = await packtypebot.getChatById(grupoId);
  const contatos = [];

  chat.participants.forEach(participant => {
    if (!participant.isMe) {
      contatos.push(participant.id._serialized);
    }
  });

  return contatos;
}

function gerarStringAleatoria(length) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  
  return result;
}

// PDF

packtypebot.on('message', async msg => {
  const lowercaseBody = msg.body ? msg.body.toLowerCase() : null;

  if (lowercaseBody !== null && (lowercaseBody.includes("#pdf") || lowercaseBody.includes("#Pdf") || lowercaseBody.includes("#PDF"))) {
    const chat = await msg.getChat();
    await chat.sendSeen();
    await delay(3000);
    const document1 = MessageMedia.fromFilePath('./pdf/pack.pdf');
    await packtypebot.sendMessage(msg.from, document1);
  } else {
  }
});

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// VÍDEO

packtypebot.on('message', async msg => {
  const lowercaseBody = msg.body ? msg.body.toLowerCase() : null;

  if (lowercaseBody !== null && lowercaseBody.includes("#video")) {
    const chat = await msg.getChat();
    await chat.sendSeen();

    let videoPath = '';
    
    if (lowercaseBody.includes("#video")) {
      videoPath = './video/video.mp4';
    } else if (lowercaseBody.includes("#video2")) {
      videoPath = './video/video.mp4';
    } else if (lowercaseBody.includes("#video3")) {
      videoPath = './video/video.mp4';
    }
    // Adicione mais condições conforme necessário para cada palavra-chave e seu respectivo vídeo
    
    if (videoPath !== '') {
      const mediavideo = MessageMedia.fromFilePath(videoPath);
      await packtypebot.sendMessage(msg.from, mediavideo, { caption: 'Legenda do Vídeo' });
    } else {
      // Se a palavra-chave não corresponder a nenhum vídeo, você pode enviar uma resposta informando que o vídeo não está disponível
      await packtypebot.sendMessage(msg.from, "Desculpe, o vídeo solicitado não está disponível.");
    }
  } else {
  }
});

// IMAGEM DISPARO

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

packtypebot.on('message', async msg => {
  const lowercaseBody = msg.body ? msg.body.toLowerCase() : null;

  if (lowercaseBody !== null && (lowercaseBody.includes("#boleto") || lowercaseBody.includes("#Boleto") || lowercaseBody.includes("#BOLETO"))) {
    const match = lowercaseBody.match(/\d+/);
    let delayInSeconds = 3;

    if (match) {
      delayInSeconds = parseInt(match[0]);
    }

    const chat = await msg.getChat();
    await chat.sendSeen();
    await waitWithDelay(delayInSeconds);

    const mediaUrl = await MessageMedia.fromUrl('https://meuarquivo.online/pack.pdf');
    await packtypebot.sendMessage(msg.from, mediaUrl, { caption: 'Boleto vencimento 12/12/2023' });
  } else {
  }
});

function waitWithDelay(delayInSeconds) {
  return new Promise(resolve => setTimeout(resolve, delayInSeconds * 1000));
}

// PIX

packtypebot.on('message', async msg => {
  const lowercaseBody = msg.body ? msg.body.toLowerCase() : null;

  if (lowercaseBody !== null && (lowercaseBody.includes("#pix") || lowercaseBody.includes("#Pix") || lowercaseBody.includes("#PIX"))) {
    const chat = await msg.getChat();
    await chat.sendSeen();
    await delay(3000);
    const img1 = MessageMedia.fromFilePath('./pix/pix.png');
    await packtypebot.sendMessage(msg.from, img1, { caption: '00020126580014BR.GOV.BCB.PIX0136570081ad-346c-49d2-96a8-36121ddcaaf65204000053039865406280.005802BR5922Fernando Machado Ramos6009SAO PAULO62140510rLjZfVFkvQ630490DD' });
  } else {
  }
});

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// LOCAL

packtypebot.on('message', async msg => {
  const lowercaseBody = msg.body ? msg.body.toLowerCase() : null;

  if (lowercaseBody !== null && (lowercaseBody.includes("#local") || lowercaseBody.includes("#Local") || lowercaseBody.includes("#LOCAL"))) {
    const lat = -16.334731119931167;
    const long = -48.94911605426851;
    const locationLink = 'https://www.google.com/maps/search/?api=1&query=' + lat + ',' + long;
    
    const mediaPath2 = MessageMedia.fromFilePath('./media/mapa.jpg');
    await packtypebot.sendMessage(msg.from, mediaPath2, { caption: locationLink });
  } else {
  }
});







