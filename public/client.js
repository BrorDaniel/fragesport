const socket = io();

let username = '';
let avatar = '';
let score = 0;
let answering = false;
let userAttempts = 3;
let canAnswer = true;
let timerInterval;
let streakCounter = 0;
let streakData = {};
let lastCorrectAnswerUser = null;
let shouldClearTimer = false;
let existingGames = [
  {name: "Game 1", players: 5, maxPlayers: 10, hasPassword: true},
  {name: "Game 2", players: 7, maxPlayers: 10, hasPassword: false}
];

let gameId = '';
  let gameName = '';
  let gamePassword = '';
  let gamePrivacy = 'public'; // default to public
  let maxPlayers = 1; // default to 1 player

  // 2. Event Listeners
  document.getElementById('createGame').addEventListener('click', function() {
    const gameNameInput = document.getElementById('game-name');
    gameName = gameNameInput.value.trim();

    if (gameName && gameName.length <= 15) {
        createGame(); // Call the createGame function
    } else {
        alert('Vänligen ange ett spelnamn med högst 15 tecken.');
    }
});

function createGame(event) {
  console.log("createGame function called");
  const gamePasswordInput = document.getElementById('game-password');
  gamePassword = gamePasswordInput.value.trim();

  // Emit the 'createGame' event to the server with the game details
  socket.emit('createGame', { gameName, maxPlayers, gamePrivacy, gamePassword });
  if (event) event.preventDefault();
}

function game() {
  // 1. Initialization
  window.onload = function() {
    const urlParams = new URLSearchParams(window.location.search);
    const gameIdFromUrl = urlParams.get('gameId');
    
    if (gameIdFromUrl) {
      // Hide the game creation view
      document.getElementById('gameCreationView').style.display = 'none';
      
      // Show the lobby view
      document.getElementById('avatarUsernameView').style.display = 'block';
    }
  }


  // Listen for a response from the server after creating a game
  socket.on('gameCreated', (data) => {
      gameId = data.gameId; // Update the gameId with the one provided by the server
      // Here, you can also update the UI to show that the game was created successfully
  });
}

game();

existingGames.forEach(game => {
  let gameDiv = document.createElement("div");
  gameDiv.innerHTML = `${game.name} (${game.players}/${game.maxPlayers})`;
  
  if (game.players < game.maxPlayers) {
    let joinBtn = document.createElement("button");
    joinBtn.innerHTML = "Gå med";
    joinBtn.onclick = function() {
      if (game.hasPassword) {
          let password = prompt("Enter password:");
          // TODO: Validate password with the server and handle the response
          socket.emit('requestJoinGameWithPassword', { gameId: game.name, password });
      } else {
          gameId = game.name;
          joinGame(gameId, false); // Join the game directly
      }
  };
  gameDiv.appendChild(joinBtn);
      
      if (game.hasPassword) {
          let lockIcon = document.createElement("span");
          lockIcon.classList.add("lock-icon");
          gameDiv.appendChild(lockIcon);
      }
  }
  
  document.getElementById("joinGame").appendChild(gameDiv);
});

function joinGame(gameIdToJoin, isPrivate) {
  gameId = gameIdToJoin; // Update the global gameId variable
  if (isPrivate) {
    const password = prompt("Enter game password:");
    socket.emit('requestJoinGameWithPassword', { gameId: gameIdToJoin, password });
} else {
    socket.emit('joinGame', { gameId: gameIdToJoin });
}
}

function showLobby() {
  document.getElementById('lobby').classList.remove('hidden');
}

document.getElementById('createGame').addEventListener('click', function() {
  // Make an AJAX request to create a game
  // On success:
  showLobby();
});

document.getElementById('joinGame').addEventListener('click', function() {
  // Make an AJAX request to join a game
  // On success:
  showLobby();
  socket.emit('joinGame');
});

function joinLobby() {
  document.getElementById('avatarUsernameView').classList.add('hidden');
  document.getElementById('lobby').classList.remove('hidden');
}


function showAvatarAndUsernameSelection() {
  document.getElementById('gameCreationView').classList.add('hidden');
  document.getElementById('avatarUsernameView').classList.remove('hidden');
}

function selectAvatar(avatarNumber) {
  avatar = `avatar${avatarNumber}`;
  const avatarImages = document.querySelectorAll('.avatar-selection img');
  avatarImages.forEach((img, index) => {
    if (index + 1 === avatarNumber) {
      img.classList.add('selected');
    } else {
      img.classList.remove('selected');
    }
  });
  document.getElementById('avatarSelectedMessage').style.display = 'none';
}

function joinLobby() {
  const usernameInput = document.getElementById('usernameInput');
  username = usernameInput.value.trim();
  const maxUsernameLength = 20;

  // Check if the username length is valid
  if (username.length > maxUsernameLength) {
    document.getElementById('avatarSelectedMessage').innerText = "Du får ha max 20 karaktärer i användarnamnet.";
    document.getElementById('avatarSelectedMessage').style.display = 'block';
    return;
  }

  // Check if the user has selected an avatar and entered a username
  if (username !== '' && avatar !== '') {
    // Check if the user has either created a game or joined an existing game
    if (gameName !== '' || gameId !== '') {
      document.getElementById('lobby').style.display = 'none';
      document.getElementById('game').style.display = 'block';
      document.getElementById('readyContainer').style.display = 'block'; // Show the "Ready" button
      socket.emit('join', { username, avatar });
    } else {
      document.getElementById('avatarSelectedMessage').innerText = "Vänligen skapa eller gå med i ett spel först.";
      document.getElementById('avatarSelectedMessage').style.display = 'block';
    }
  } else {
    document.getElementById('avatarSelectedMessage').innerText = "Vänligen välj avatar och fyll i användarnamn för att gå med i spelet.";
    document.getElementById('avatarSelectedMessage').style.display = 'block';
  }
}


function markReady() {
  const username = document.getElementById('usernameInput').value;
  socket.emit('userReady', username); // Emit 'userReady' event when button is clicked
  document.getElementById('readyButton').innerText = 'Väntar på de andra...';
  document.getElementById('readyButton').disabled = true;
}

function sendMessageOrAnswer() {
  const messageInput = document.getElementById('messageInput');
  const message = messageInput.value.trim();
  if (message !== '') {
    if (answering) {
      if (canAnswer) {
        if (userAttempts > 0) { // Ensure there are attempts left
          socket.emit('submitAnswer', { username, answer: message });
        } else {
          // If no attempts left, display a message
          const chat = document.getElementById('chat');
          const botMessage = document.createElement('p');
          botMessage.innerHTML = `<strong>Bot:</strong> Inga fler försök kvar på denna fråga.`;
          botMessage.classList.add('wrong-answer');
          chat.appendChild(botMessage);
          chat.scrollTop = chat.scrollHeight;
          canAnswer = false; // Disable answering
          document.getElementById('messageInput').disabled = true; // Disable message input
          answering = false; // Set answering to false
          return; // Exit the function to prevent further messages
        }
      }
    } else {
      socket.emit('sendMessage', { username, message });
    }
    messageInput.value = '';
    pressSendButton(); // Call the function to press the send button
  }
}

function pressSendButton() {
  const sendButton = document.getElementById('sendButton');
  sendButton.classList.add('pressed');
  setTimeout(() => {
    sendButton.classList.remove('pressed');
  }, 100);
}

const messageInput = document.getElementById('messageInput');
messageInput.addEventListener('keypress', (event) => {
  if (event.key === 'Enter') {
    sendMessageOrAnswer();
  }
});

socket.on('message', (data) => {
  const chat = document.getElementById('chat');

  const newMessage = document.createElement('p');
  newMessage.innerHTML = `<strong>${data.username}:</strong> ${data.message}`;

  // If the message is a "on fire" message from the bot, add the 'fire-message' class
  if (data.username === 'Bot' && data.message.includes('är on fire!')) {
    newMessage.classList.add('fire-message');
  }

  if (data.username === 'Bot' && data.message.includes('är HELT GALEN!')) {
    newMessage.classList.add('blazing-message');
  }

  if (data.username === 'Bot') {
    if (data.message.includes('Fel!')) {
      newMessage.classList.add('wrong-answer');
      canAnswer = true;
    } else if (data.message.includes('svarade rätt') && data.message.includes('poäng')) {
      newMessage.classList.add('correct-answer');
    } else if (data.message.includes('Inga fler försök kvar på denna fråga.')) {
      newMessage.classList.add('wrong-answer');
      if (document.getElementById('timerDisplay').textContent === '0') {
        clearInterval(timerInterval);
      }
    }
    if (data.message.includes('Tiden är ute!')) {
      clearInterval(timerInterval);
    }
  }

  chat.appendChild(newMessage);
  chat.scrollTop = chat.scrollHeight;
});

socket.on('gameCreated', (data) => {
  gameId = data.gameId; // Update the global gameId variable with the provided gameId
  // Handle game creation success, e.g., show a message to the user or navigate to the game lobby
});

socket.on('newGameCreated', (data) => {
  console.log("Received createGame event from client");
  console.log("Game ID:", data.gameId);
  
  // Hide the game creation view
  document.getElementById('gameCreationView').style.display = 'none';
  
  // Show the lobby view
  document.getElementById('avatarUsernameView').style.display = 'block';
  
  // You can also set the game ID somewhere on the page or in a variable if needed
});

socket.on('gameJoinSuccess', (data) => {
  // Handle successful game join, e.g., navigate to the game lobby
});

socket.on('gameJoinError', (data) => {
  // Handle game join error, e.g., show an error message to the user
});

socket.on('countdown', (data) => {
  const chat = document.getElementById('chat');
  
  // Create a new <p> element for the countdown
  const countdownElement = document.createElement('p');
  
  countdownElement.innerHTML = `<strong>Bot:</strong> ${data.count}...`;
  
  // Append the countdown to the chat
  chat.appendChild(countdownElement);
  
  chat.scrollTop = chat.scrollHeight;
});

socket.off('allUsersAnswered').on('allUsersAnswered', () => {
  const chat = document.getElementById('chat');
  clearInterval(timerInterval);
  setTimeout(() => {
      askNewQuestion();
  }, 3000);
  chat.scrollTop = chat.scrollHeight;
});

socket.on('joinGameWithPasswordResponse', (data) => {
  if (data.success) {
      gameId = data.gameId;
      showLobby();
  } else {
      alert('Incorrect password or another error occurred.');
  }
});

socket.on('question', (data) => {
  const chat = document.getElementById('chat');
  if (data.username === 'Bot') {
    answering = true;
    canAnswer = true;
    
    // Create a new <p> element for the question
    const questionElement = document.createElement('p');
    questionElement.innerHTML = `<strong>${data.username}:</strong> ${data.question}`;
    
    // Append the question to the chat
    chat.appendChild(questionElement);
    
    document.getElementById('messageInput').placeholder = 'Svar här';
    document.getElementById('messageInput').focus();
    startTimer();
    document.getElementById('timerDisplay').style.visibility = 'visible'; // Show the timer
  }
  chat.scrollTop = chat.scrollHeight;
});

function startTimer() {
  let timeLeft = 20;
  const timerDisplay = document.getElementById('timerDisplay');
  timerDisplay.textContent = timeLeft;
  timerDisplay.classList.add('active', 'timer-display');

  // Show the timer
  timerDisplay.style.display = 'inline';
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timeLeft--;
    if (timeLeft >= 0) {
      timerDisplay.textContent = timeLeft;

      if (timeLeft === 20) {
        // Remove the timer-countdown class when timer is at 20
        timerDisplay.classList.remove('timer-countdown');
      } else if (timeLeft <= 3) {
        // Add the timer-countdown class to make the timer pulsate in red color
        timerDisplay.classList.add('timer-countdown');
      } else {
        // Remove the timer-countdown class
        timerDisplay.classList.remove('timer-countdown');
      }
    } else {
      clearInterval(timerInterval);
      document.getElementById('messageInput').placeholder = 'Time is up! Waiting for the next question...';
      canAnswer = false;
      timerDisplay.textContent = '0'; // Display '0' when the timer reaches 0
      timerDisplay.classList.remove('timer-countdown');
    }
  }, 1000);
}

socket.on('correctAnswer', (data) => {
  clearTimeout(questionTimer);
  const chat = document.getElementById('chat');

  if (data.username === username) {
    const previousScore = score;
    score += 1;
    document.getElementById('messageInput').value = '';
    document.getElementById('messageInput').placeholder = 'Waiting for the next question...';
    answering = false;
    const scoreElement = document.getElementById('score');
    scoreElement.innerHTML = `${data.username} (${score} points)`;

    if (score > previousScore) {
      animateLeaderboardMove(data.username);
    }

    // Hide the timer
    const timerDisplay = document.getElementById('timerDisplay');
    timerDisplay.classList.add('hide');
    showCorrectAnswerAnimation(data.username);

    if (lastCorrectAnswerUser === data.username) {
      updatePlayerStreak(data.username, true);
    } else {
      if (lastCorrectAnswerUser !== null) {
        updatePlayerStreak(lastCorrectAnswerUser, false);
      }
      updatePlayerStreak(data.username, true);
    }

    lastCorrectAnswerUser = data.username;
  } 

  // For all other players
  Object.keys(streakData).forEach(playerId => {
    if (playerId !== username && playerId !== lastCorrectAnswerUser) {
      updatePlayerStreak(playerId, false);
    }
  });

  chat.scrollTop = chat.scrollHeight;
});


socket.on('streak', (data) => {
  showStreakBadge(data.username);
});

function updatePlayerStreak(playerId, wasFirstCorrect) {
  if (!streakData[playerId]) {
    streakData[playerId] = {
      correctAnswerStreak: 0,
      hasFire: false,
      isBlazing: false
    };
  }

  if (wasFirstCorrect) {
    streakData[playerId].correctAnswerStreak++;
    const playerElement = document.getElementById(playerId);
    if (streakData[playerId].correctAnswerStreak >= 3 && !streakData[playerId].hasFire) {
        playerElement.classList.add('fire-icon', 'fiery-animation');
        playerElement.classList.remove('blazing-icon', 'blazing-animation'); // Ensure blazing is removed if player drops to fire level
        streakData[playerId].hasFire = true;
        streakData[playerId].isBlazing = false; // Reset blazing status
    }
    if (streakData[playerId].correctAnswerStreak >= 5 && !streakData[playerId].isBlazing) {
        playerElement.classList.remove('fire-icon', 'fiery-animation'); // Remove fire status
        playerElement.classList.add('blazing-icon', 'blazing-animation'); // Add blazing status
        streakData[playerId].hasFire = false; // Reset fire status
        streakData[playerId].isBlazing = true;
    }
} else {
    streakData[playerId].correctAnswerStreak = 0;
    const playerElement = document.getElementById(playerId);
    if (streakData[playerId].hasFire) {
        playerElement.classList.remove('fire-icon', 'fiery-animation');
        streakData[playerId].hasFire = false;
    }
    if (streakData[playerId].isBlazing) {
        playerElement.classList.remove('blazing-icon', 'blazing-animation');
        streakData[playerId].isBlazing = false;
    }
}
}

socket.on('wrongAnswer', (data) => {
  const chat = document.getElementById('chat');
  
  if (data.username === username) {
      userAttempts[data.username] = data.attempts;
      document.getElementById('messageInput').value = '';
      if (userAttempts[data.username] > 0) {
          document.getElementById('messageInput').placeholder = `Fel! ${userAttempts[data.username]} försök kvar.`;
      } else {
          document.getElementById('messageInput').placeholder = 'Inga försök kvar. Väntar på nästa fråga...';
          canAnswer = false;
      }
      document.getElementById('messageInput').classList.add('incorrect-answer', 'shake');
      showWrongAnswerAnimation(data.username); // Call the function to show the wrong answer animation
  }

  const botMessage = document.createElement('p');
  if (userAttempts[data.username] > 0) {
      botMessage.innerHTML = `<strong>Bot:</strong> Fel! ${userAttempts[data.username]} försök kvar.`;
  } else {
      botMessage.innerHTML = `<strong>Bot:</strong> Inga fler försök kvar på denna fråga.`;
  }
  botMessage.classList.add('wrong-answer');
  chat.appendChild(botMessage);
  chat.scrollTop = chat.scrollHeight;
});


// Call this function whenever a player answers a question
// Pass in the player's id and whether their answer was correct
updatePlayerStreak('player1', true);

socket.on('updateUserList', (userList) => {
  console.log("Received user list:", userList);
  const userListElement = document.getElementById('userList');
  userListElement.innerHTML = '';
  userList.sort((a, b) => b.score - a.score);
  userList.forEach((user) => {
      const userElement = document.createElement('li');
      userElement.classList.add('userListItem');
      userElement.dataset.username = user.username;
      
      let innerHTMLContent = `<img src="/avatars/${user.avatar}.png" alt="${user.username}" class="user-avatar"> <strong>${user.username}</strong> <span class="score">(${user.score} poäng)</span>`;
      
      if (user.isOnFire) { // Check if the user is on fire
          innerHTMLContent += ` <img src="/fire.gif" alt="Fire" class="fire-icon">`;
      }
      if (user.isBlazing) { // Check if the user is blazing hot
        innerHTMLContent += ` <img src="/blazing.gif" alt=\"Blazing Hot\" class=\"blazing-icon\">`;
    }
      userElement.innerHTML = innerHTMLContent;
      userListElement.appendChild(userElement);

      if (user.score >= 20) {
        // document.body.classList.add('fade'); // Commented out to remove fade effect
        document.getElementById('winner').style.display = 'block';
        document.querySelector('.winner-avatar').src = `/avatars/${user.avatar}.png`;
        document.querySelector('#winner h2').innerText = user.username;
        document.querySelector('#winner p').innerText = `(${user.score} poäng)`;
        document.getElementById('winner').classList.add('zoom');
      }
  });
});


socket.on('startGame', () => {
  document.getElementById('readyContainer').style.display = 'none';
});

socket.on('gameWon', (data) => {
  const gameElement = document.getElementById('game');
  const winnerElement = document.getElementById('winner');
  const playAgainBtn = document.getElementById('play-again-btn'); // Get the "Spela igen" button element

  gameElement.style.opacity = '0';
  gameElement.style.pointerEvents = 'none';

  const winnerAvatar = document.querySelector('.winner-avatar');
  winnerAvatar.src = `/avatars/${data.avatar}.png`;

  const winnerName = document.querySelector('#winner h2');
  winnerName.innerText = data.username;

  // Hide the winner's avatar initially
  winnerAvatar.style.display = 'none';

  // Show the celebration GIFs
  for (let i = 0; i < 3; i++) {
    const celebrationGif = document.createElement('img');
    celebrationGif.src = '/celebration.gif';
    celebrationGif.alt = 'Celebration';
    celebrationGif.classList.add('celebration-gif', `celebration-gif-${i}`);
    winnerElement.appendChild(celebrationGif);
  }

  // Dynamically generate buttons from 1-10
for (let i = 1; i <= 10; i++) {
  let btn = document.createElement("button");
  btn.innerHTML = i;
  btn.onclick = function() {
      // Highlight the selected button
      let buttons = document.querySelectorAll("#player-count-buttons button");
      buttons.forEach(button => button.classList.remove("selected"));
      btn.classList.add("selected");
  };
  document.getElementById("player-count-buttons").appendChild(btn);
}

// Toggle game privacy and show/hide password input
document.getElementById("game-privacy-toggle").addEventListener("change", function() {
  let passwordInput = document.getElementById("game-password");
  if (this.checked) {
      passwordInput.classList.remove("hidden");
  } else {
      passwordInput.classList.add("hidden");
  }
});


  // Add the continuous shake animation to the winner's avatar
  winnerAvatar.classList.add('shake');

  // Use GSAP to animate the winner element and shake effect
  gsap.fromTo(
    [winnerElement, '.celebration-gif-0', '.celebration-gif-1', '.celebration-gif-2'],
    {
      opacity: 0,
      scale: 0.5,
      display: 'flex',
    },
    {
      duration: 2,
      opacity: 1,
      scale: 1,
      display: 'flex',
      ease: 'power2.out',
      onStart: function () {
        // Show the winner's avatar and set its z-index
        winnerAvatar.style.display = 'block';
        winnerElement.style.zIndex = 2;
      },
      onComplete: function () {
        // Start the shake animation for the winner's avatar
        gsap.fromTo(
          winnerAvatar,
          {
            opacity: 1,
            scale: 1,
            display: 'block',
          },
          {
            duration: 0.5,
            opacity: 1,
            scale: 1,
            display: 'block',
            ease: 'power2.out',
            repeat: -1, // Infinite repetition
            yoyo: true, // Reverses the animation on repeat
          }
        );
      },
    }
  );
});

socket.on('allUsersAnswered', () => {
  const chat = document.getElementById('chat');
  clearInterval(timerInterval);
  setTimeout(() => {
    askNewQuestion();
  }, 3000);
  chat.scrollTop = chat.scrollHeight;
});

socket.on('newQuestion', () => {
  const chat = document.getElementById('chat');
  setTimeout(() => {
    askNewQuestion();
  }, 3000);
  chat.scrollTop = chat.scrollHeight;
});

socket.on('restartGame', () => {
  // Here you can update the UI as needed, e.g., clear the previous question and answers
  // and display any messages to the players if necessary
});

function askNewQuestion() {
  canAnswer = true;
  document.getElementById('messageInput').placeholder = 'Svar här';
  document.getElementById('messageInput').value = '';
  startTimer();

  // Clear the timer if shouldClearTimer is true
  if (shouldClearTimer) {
    clearInterval(timerInterval);
    document.getElementById('messageInput').placeholder = 'Time is up! Waiting for the next question...';
    canAnswer = false;
    document.getElementById('timerDisplay').textContent = '0';
    shouldClearTimer = false;
  }
}

function animateLeaderboardMove(username) {
  const userList = document.getElementById('userList');
  const playerElement = document.querySelector(`#userList li[data-username="${username}"]`);
  if (playerElement && playerElement.previousElementSibling) {
    const previousElement = playerElement.previousElementSibling;
    userList.insertBefore(playerElement, previousElement);
    playerElement.classList.add('move-up');
    setTimeout(() => {
      playerElement.classList.remove('move-up');
    }, 1000);
  }
}

function showStreakBadge(username) {
  console.log(`Attempting to show streak badge for ${username}`);
  const userListItem = document.querySelector(`li[data-username="${username}"]`);
  if (userListItem) {
      const badge = document.createElement('img');
      badge.src = "/fire.gif";  // Update the path to your fire.gif image
      badge.alt = "Fire Streak";
      badge.classList.add('fire-icon'); 
      userListItem.appendChild(badge);
      console.log(`Streak badge shown for ${username}`);
  } else {
      console.log(`User list item not found for ${username}`);
  }
}

window.onload = function() {
  var userList = document.getElementById('userList');

  var sortable = Sortable.create(userList, {
    animation: 150,  // animation speed (ms)
    handle: '.userListItem',  // class name of the items in the list
    onEnd: function (evt) {
      // evt.oldIndex;  // element's old index within parent
      // evt.newIndex;  // element's new index within parent
      // + more properties
    },
  });
};

document.addEventListener("DOMContentLoaded", function() {
  const gamePrivacyToggle = document.getElementById('game-privacy-toggle');
  gamePrivacyToggle.addEventListener('change', function() {
    gamePrivacy = this.checked ? 'private' : 'public';
    const gamePasswordInput = document.getElementById('game-password');
    gamePasswordInput.style.display = this.checked ? 'block' : 'none';
  });

  // Add event listeners for player count buttons (1-10)
  for (let i = 1; i <= 10; i++) {
    const button = document.getElementById(`player-count-${i}`);
    if (button) {
      button.addEventListener('click', function() {
        maxPlayers = i;
        // Highlight the selected button and unhighlight others
        for (let j = 1; j <= 10; j++) {
          const btn = document.getElementById(`player-count-${j}`);
          if (btn) {
            if (j === i) {
              btn.classList.add('selected');
            } else {
              btn.classList.remove('selected');
            }
          }
        }
      });
    }
  }

  const sendButton = document.getElementById('sendButton');
  if (sendButton) {
      sendButton.addEventListener('click', sendMessageOrAnswer);
  }
});


function showCorrectAnswerAnimation(username) {
  const userAvatar = document.querySelector(`[data-username="${username}"]`);

  if (userAvatar) {
    userAvatar.classList.add('glitter');
    setTimeout(() => {
      userAvatar.classList.remove('glitter');
    }, 1000); // Remove the glitter class after 1 second (adjust as needed)
  }
}

function showWrongAnswerAnimation(username) {
  const userAvatar = document.querySelector(`[data-username="${username}"]`);

  if (userAvatar) {
    userAvatar.classList.add('shake-avatar');
    setTimeout(() => {
      userAvatar.classList.remove('shake-avatar');
    }, 1000); // Remove the shake-avatar class after 1 second (adjust as needed)
  }
}