const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const games = {};
app.use(express.static(__dirname + '/public'));
app.use(express.json());

const questions = require('./public/questions.json');
const QUESTION_TIMEOUT = 20000; // 20 seconds for each question

function updateGamesList() {
  // Create an array of active games with the necessary details
  const gamesList = Object.values(games).map(game => ({
    name: game.name,
    players: game.users.length,
    maxPlayers: game.maxPlayers,
    hasPassword: !!game.password,
    gameCode: game.gameCode // Assuming you have a gameCode property in the Game class
  }));

  // Emit the updated games list to all connected clients
  io.emit('updateGamesList', gamesList);
}

io.on('connection', (socket) => {
  console.log('A user connected');

function createGame() {
  const gameName = document.getElementById('game-name').value;
  const isPrivate = document.getElementById('game-privacy-toggle').checked;
  const gamePassword = document.getElementById('game-password').value;

  // Validate the input (e.g., check if the game name is not empty)
  if (!gameName) {
    alert('Please enter a game name.');
    return;
  }

  // Create the game object to send to the server
  const gameData = {
    name: gameName,
    private: isPrivate,
    password: gamePassword
  };
}

socket.on('joinGame', (gameId, username, avatar) => {
  let game = games[gameId];
  if (game) {
    socket.join(gameId); // Join the room for this game
    socket.gameCode = gameId; // Assign the game code to the socket
    game.addPlayer(socket, username, avatar); // Add the player to the game
    io.to(gameId).emit('updateUserList', game.users); // Notify all clients in this game
  }
});
  
socket.on('userReady', (username) => { // Listen for 'userReady' event
  const game = games[socket.gameCode]; // Get the game object using gameCode
  if (!game) {
    console.error('Game not found for code:', socket.gameCode);
    return;
  }
  const userIndex = game.users.findIndex(user => user.username === username);
  if (userIndex !== -1) {
    game.users[userIndex].ready = true; // Set this user's 'ready' property to true
  }
  io.emit('updateUserList', game.users); // Emit the updated users list

  // If all users are ready, start the game
  if (game.users.every(user => user.ready)) { // Check if all users are ready
    gameInProgress = true;
    io.emit('startGame'); // Emit the startGame event
    io.emit('message', { username: 'Bot', message: 'Spelet börjar strax. Först till 20 vinner!' });
    setTimeout(() => {
      loadQuestionsAndStart();
    }, 3000);
  }
});

  socket.on('submitAnswer', (gameId, data) => {
    let game = games[gameId];
    if (game && game.gameInProgress) {
      game.processAnswer(socket, data);
    }
    if (gameInProgress &&
      currentQuestion <= questions.length &&
      userAttempts[data.username] > 0 &&
      !correctAnsweredUsers[data.username]) {

        const question = questions[currentQuestion - 1];
        const userAnswer = data.answer.toLowerCase().trim();
        const correctAnswers = question.answer.map(answer => answer.toLowerCase().trim());

        const userIndex = games[socket.gameCode].users.findIndex(user => user.username === username);
        const timeTaken = Date.now() - questionStartTime;

        if (correctAnswers.includes(userAnswer)) {
          userLastAnswerTime[data.username] = Date.now();
          if (userIndex !== -1) {
              const position = correctAnsweredCount + 1;
              const score = answerScores[position - 1] || 0;
              users[userIndex].score += score;
              correctAnswers.forEach(answer => correctAnsweredUsers[answer] = true);
              correctAnsweredCount++;
      
              if (timeTaken <= 5000) {
                  userStreaks[data.username] = (userStreaks[data.username] || 0) + 1;
      
                  if (userStreaks[data.username] === 3) {
                      io.emit('message', {
                          username: 'Bot',
                          message: `${data.username} är on fire! <img src="/fire.gif" alt="Fire" class="fire-icon">`
                      });
                      users[userIndex].isOnFire = true;
                  } else if (userStreaks[data.username] === 5) {
                      io.emit('message', {
                          username: 'Bot',
                          message: `${data.username} är HELT GALEN! <img src="/blazing.gif" alt="Fire" class="fire-icon">`
                      });
                      users[userIndex].isOnFire = false;  // Reset the on-fire status
                      users[userIndex].isBlazing = true;  // Set the blazing status
                      userStreaks[data.username] = 0;  // Reset the streak
                  }
              } else {
                  resetStreak(data.username, userIndex);
              }

                if (users[userIndex].score >= 20) {
                    io.emit('gameWon', { username: users[userIndex].username, avatar: users[userIndex].avatar, score: users[userIndex].score });
                }

                sendPointsFeedback(data.username, score);

                io.emit('updateUserList', users);

                if (correctAnsweredCount === users.length) {
                    clearTimeout(questionTimer);
                    io.emit('allUsersAnsweredCorrectly');  // Emit the new event
                    setTimeout(() => {
                        io.emit('message', { username: 'Bot', message: 'Bra jobbat! Nästa fråga kommer om...' });
                        setTimeout(() => {
                            askQuestion();
                        }, 3000);
                    }, 1000);
                }
            }
        } else {
            userStreaks[data.username] = 0;  // Reset the streak if the answer is wrong
            userAttempts[data.username]--;
            if (userAttempts[data.username] > 0) {
                socket.emit('message', { username: 'Bot', message: `Fel! ${userAttempts[data.username]} försök kvar.` });
            } else {
                socket.emit('message', { username: 'Bot', message: 'Inga fler försök kvar på denna fråga.' });
                if (!correctAnsweredUsers[data.username]) {
                    finishedAnsweringCount++;  // Increment the new counter here
                }
                users[userIndex].isOnFire = false; // Set the user's on-fire status to false only when no attempts are left.
            }

            io.emit('updateUserList', users);  // Emit the updated user list to reflect the removed streak/fire icon
        }
    }

    socket.on('disconnect', () => {
      console.log('A user disconnected');
      const gameCode = socket.gameCode;
      if (gameCode && games[gameCode]) {
          const game = games[gameCode];
          const index = game.users.findIndex((user) => user.id === socket.id);
          if (index !== -1) {
              game.users.splice(index, 1);
          }
          if (game.users.length === 0) {
              setTimeout(() => {
                  if (games[gameCode] && games[gameCode].users.length === 0) {
                      delete games[gameCode];
                  }
              }, 300000);  // 5 minutes delay before deleting the game
          }
      }
      updateGamesList();
    });
});
});

class Game {
  constructor(name, maxPlayers, password) {
    this.name = name; // Name of the game
    this.maxPlayers = maxPlayers; // Maximum number of players allowed
    this.password = password; // Password for the game (if any)
    this.gameCode = this.generateGameId(); // Game code (assuming you have a method to generate it)
    this.users = [];
    this.currentQuestion = 0;
    this.gameInProgress = false;
    this.userAttempts = {};
    this.questionTimer;
    this.answerScores = [3, 2, 1];
    this.correctAnswers = [];
    this.correctAnsweredUsers = {};
    this.userLastAnswerTime = {};
    this.correctAnsweredCount = 0;
    this.finishedAnsweringCount = 0;
    this.userStreaks = {};
    this.questionStartTime = null;
  }

  addPlayer(socket, username, avatar) {
    // Add the player to this game
  }
  
  processAnswer(socket, data) {
    // Process an answer for this game
  }

  generateGameId() {
    let gameCode = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    for (let i = 0; i < 6; i++) {
      gameCode += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    // Ensure the gameCode is unique
    while (Object.values(games).some(game => game.gameCode === gameCode)) {
      gameCode = '';
      for (let i = 0; i < 6; i++) {
        gameCode += characters.charAt(Math.floor(Math.random() * characters.length));
      }
    }
    return gameCode;
  }

  loadQuestionsAndStart() {
    this.currentQuestion = 0;
    this.shuffleQuestions();
    this.askQuestion();
  }

  shuffleQuestions() {
    for (let i = questions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [questions[i], questions[j]] = [questions[j], questions[i]];
    }
  }

  startCountdown() {
    io.emit('countdown', { count: 3 });
    setTimeout(() => {
      io.emit('countdown', { count: 2 });
      setTimeout(() => {
        io.emit('countdown', { count: 1 });
      }, 1000);
    }, 1000);
  }

  resetStreak(username, userIndex) {
    this.userStreaks[username] = 0;
    this.users[userIndex].isOnFire = false;
    this.users[userIndex].isBlazing = false;
  }

  getCorrectAnswerText(answers) {
    if (!answers || answers.length === 0) {
      return '';
    }

    if (answers.length === 1) {
      return answers[0];
    }

    // Find the longest correct answer
    let longestAnswer = answers[0];
    for (let i = 1; i < answers.length; i++) {
      if (answers[i].length > longestAnswer.length) {
        longestAnswer = answers[i];
      }
    }

    return longestAnswer;
  }

  sendPointsFeedback(username, points) {
    io.emit('message', { username: 'Bot', message: `${username} svarade rätt och fick ${points} poäng!` });
  }

  askQuestion() {
    if (currentQuestion < questions.length) {
      correctAnswers = [];
      correctAnsweredUsers = {};
      correctAnsweredCount = 0; // Reset the count
      const question = questions[currentQuestion++];
      for (const user in userAttempts) {
        userAttempts[user] = 3;
      }
      startCountdown();
      const currentTime = Date.now();
    for (let user of users) {
        if (user.isOnFire && (currentTime - (userLastAnswerTime[user.username] || 0) > 5000)) {
            user.isOnFire = false;
        }
    }
    io.emit('updateUserList', users);

      setTimeout(() => {
        questionStartTime = Date.now();
        io.emit('question', {
          username: 'Bot',
          questionNumber: currentQuestion,
          question: question.question,
          correctAnswerText: getCorrectAnswerText(question.answer)
        });
        setTimeout(() => {
          const currentTime = Date.now();
          for (let user of users) {
              if ((currentTime - (userLastAnswerTime[user.username] || 0) > 5000)) {
                  resetStreak(user.username, users.findIndex(u => u.username === user.username));
              }
          }
          io.emit('updateUserList', users);
      }, 5000);
        if (questionTimer) {
          clearTimeout(questionTimer);
        }
        questionTimer = setTimeout(() => {
          io.emit('message', { username: 'Bot', message: `Tiden är ute! Rätt svar är ${getCorrectAnswerText(question.answer)}. Nästa fråga om...` });
          setTimeout(() => {
            askQuestion();
          }, 3000);
        }, QUESTION_TIMEOUT);
        io.emit('scrollChatToBottom');
      }, 4000);
    } else {
      gameInProgress = false;
      io.emit('message', { username: 'Bot', message: 'Inga fler frågor. Tack för att du spelade!' });
    }
  }

  // ... [rest of the methods for the Game class]
}

app.post('/create', (req, res) => {
  const { name, maxPlayers, password } = req.body;
  let game = new Game(name, maxPlayers, password);
  const gameId = game.generateGameId();
  games[gameId] = game;
  updateGamesList();
  res.json({ gameId: gameId });
});

app.post('/join', (req, res) => {
  let game = games[req.body.id];
  if (game) {
    game.addPlayer();
    updateGamesList(); // Update the active games list
    res.json({ status: 'joined' });
  } else {
    res.json({ status: 'not found' });
  }
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
