// Create a client instance
var cid = new Date();
cid = cid.getMilliseconds();
var clientBroker = {
    client: null,
    config: {
        clientHost: 'broker.vikstech.com',
        clientPath: '',
        clientPort: 9001,
        clientUser: '',
        clientPassword: '',
        clientTopic: '',
        clientId: "user_" + cid
    },
    actions: {
        onConnectionLost: function (responseObject) {
            if (responseObject.errorCode !== 0) {
                console.log("Connessione con il Broker MQTT persa: :" + responseObject.errorMessage);
            }
        },
        onMessageArrived: function (message) {
            console.log(message);
            try {
                let data = JSON.parse(message.payloadString);
                game.dispatchAction(data);
            } catch (e) {
                console.log('Errore pacchetto ricevuto', e);
            }
        },
        onConnect: function () {
            console.log("Connected to MQTT Broker");
        },
        onFail: function (e) {
            console.log("Errore di connessione al Broker MQTT", e);
            alert('Errore di connessione al Broker MQTT');
        },
        sendMsg: function (msg) {
            if (!clientBroker.config.clientTopic)
                return alert('Non sei collegato a nessuna partita');
            message = new Paho.MQTT.Message(msg);
            message.destinationName = clientBroker.config.clientTopic;
            clientBroker.client.send(message);
        },
        setTopic: function (topic) {
            clientBroker.config.clientTopic = topic;
            clientBroker.client.subscribe(clientBroker.config.clientTopic);
        }
    },
    init: function () {
        clientBroker.client = new Paho.MQTT.Client(clientBroker.config.clientHost, clientBroker.config.clientPort, clientBroker.config.clientPath, clientBroker.config.clientId);
        clientBroker.client.onConnectionLost = clientBroker.actions.onConnectionLost;
        clientBroker.client.onMessageArrived = clientBroker.actions.onMessageArrived;
        clientBroker.client.connect({
            invocationContext: {host: clientBroker.config.clientHost, port: clientBroker.config.clientPort, path: clientBroker.client.path, clientId: clientBroker.config.clientId},
            timeout: 3,
            keepAliveInterval: 60,
            cleanSession: true,
            useSSL: true,
            reconnect: true,
            userName: clientBroker.config.clientUser,
            password: clientBroker.config.clientPassword,
            onSuccess: clientBroker.actions.onConnect,
            onFailure: clientBroker.actions.onFail
        });
    }
}



var game = {
    tpls: {
        show: function (a) {
            $('#stage').html(a);
        },
        init: function () {
            let tpls = ['startGameButton', 'initNewGame', 'timeForPlay', 'initNewGame2Step', 'question', 'goodStillAlive', 'badStillAlive', 'gameOver', 'victory'];
            for (let i in tpls) {
                game.tpls[tpls[i]] = $('#' + tpls[i]).clone();
                $('#' + tpls[i]).remove();
            }
        }
    },
    init: function () {
        game.tpls.init();
        $.getJSON('questions.json', function (resp) {
            game.config.questions = game.volatileData.questionsRemain = resp;
            game.tpls.show(game.tpls.startGameButton);
        })
    },
    status: {
        addStatus: function (status) {
            game.status.history.push(status);
            game.status.actual = status;
        },
        history: [],
        actual: null,
        easy: false
    },
    volatileData: {
        livesLost: 0,
        goodAnswer: [],
        badAnswer: [],
        questionsRemain: [],
        answers: 0,
        actualPlayer: null,
        actualChord: {x: null, y: null},
        chords: {playerOne: [/*{x:null,y:null, c; ((x*10)+y)}*/], playerTwo: []},
        combinations: [
            [{x: 0, y: 0}, {x: 0, y: 1}, {x: 0, y: 2}],
            [{x: 1, y: 0}, {x: 1, y: 1}, {x: 1, y: 2}],
            [{x: 2, y: 0}, {x: 2, y: 1}, {x: 2, y: 2}],
            [{x: 0, y: 0}, {x: 1, y: 0}, {x: 2, y: 0}],
            [{x: 0, y: 1}, {x: 1, y: 1}, {x: 2, y: 1}],
            [{x: 0, y: 2}, {x: 1, y: 2}, {x: 2, y: 2}],
            [{x: 0, y: 0}, {x: 1, y: 1}, {x: 2, y: 2}],
            [{x: 2, y: 0}, {x: 1, y: 1}, {x: 0, y: 2}],
        ],
        chordsNumbers: [
            {x: 0, y: 0}, //0
            {x: 1, y: 0}, //1
            {x: 2, y: 0}, //2
            {x: 0, y: 1}, //3
            {x: 1, y: 1}, //4
            {x: 2, y: 1}, //5
            {x: 0, y: 2}, //6
            {x: 1, y: 2}, //7
            {x: 2, y: 2}, //8
        ]
    },
    config: {
        questions: []
    },
    dispatchAction: function (data) {

        if (!data.hasOwnProperty('cmd'))
            return;
        if (!data.hasOwnProperty('trisBox'))
            data.trisBox = 'asda';
        switch (data.cmd) {
            case "presence":
                game.actions.syncAll();
                break;
            case "newGameWaitToStart":
                game.status.addStatus('waitRobotToStart');
                console.log('Dispositivo ' + data.trisBox + ' in attesa della pressione sul pulsante.');
                break;
            case "newGameStarted":
                if (game.status.actual === 'waitRobotToStart') {
                    console.log('Ricevuto ack di reset dalla TrisBox: ' + data.trisBox + '. avvio il gioco');
                    game.status.addStatus('gameStarted');
                    clientBroker.actions.sendMsg(JSON.stringify({"cmd": "gameStartedAck", "trisBox": data.trisBox, "actualPlayer": game.volatileData.actualPlayer}));
                    game.status.addStatus('gameStarted');
                } else {
                    console.log('Premuto tasto di start sul dispositivo ' + data.trisBox + ' con gioco gia avviato.. lascio perdere');
                }
                break;
            case "gameStartedAck":
                game.status.addStatus('gameStartedAck');
                console.log('Ho inviato il messaggio alla TrisBox ' + data.trisBox + ' adesso è possibile iniziare a giocare')
//                game.tpls.show(game.tpls.gameStarted);
                game.volatileData.actualPlayer = 1;
                let tpl = $(game.tpls.timeForPlay)[0].outerHTML;
                tpl = tpl.replace('{player}', game.volatileData.playerOne);
                game.tpls.show(tpl);
                break;
            case "question":

                console.log('Richiesta domanda per ambito ' + data.ambit + ' dal dispositivo ' + data.trisBox + " per giocatore " + game.volatileData.actualPlayer);
                if (game.actions.checkIfIsDraw()) {
                    // vite finite
                    console.log('mosse finite, finita in pareggio');
                    return;
                }

                if (game.status.easy) {
                    game.volatileData.actualChord = {x: data.x, y: data.y};
                    game.actions.setAsCorrectAnswer(1);
                    game.volatileData.actualPlayer = (game.volatileData.actualPlayer == 1) ? 2 : 1;
                    break;
                }

                if (game.status.actual === 'gameStarted' || game.status.actual === 'gameStartedAck' || game.status.actual === 'question') { // unici stati accettati per porre una domanda
                    game.volatileData.actualChord = {x: data.x, y: data.y};
                    let question = game.actions.getQuestion();
                    if (question == null) {
                        console.log('Richiesta domanda ma domande terminate.. gameover');
                        return game.actions.gameOver('Non ci sono altre domande!');
                    }

                    game.status.addStatus('question');
                    game.actions.showQuestion(question);
                } else {
                    console.log('Stato errato', game.status.actual);
                }
                break;
        }
        console.log(data);
    },
    findCombinationNumber: function (x, y) {
        for (let i in  game.volatileData.chordsNumbers) {
            if (x == game.volatileData.chordsNumbers[i].x && y == game.volatileData.chordsNumbers[i].y)
                return i;
        }
        return null;
    },
    actions: {
        syncAll: function () {
            let pOne = [0, 0, 0, 0, 0, 0, 0, 0, 0];
            let pTwo = [0, 0, 0, 0, 0, 0, 0, 0, 0];
            for (let i in game.volatileData.chords.playerOne) {
                let r = game.findCombinationNumber(game.volatileData.chords.playerOne[i].x, game.volatileData.chords.playerOne[i].y);
                if (r !== null) {
                    pOne[r] = 1;
                }
            }
            for (let i in game.volatileData.chords.playerTwo) {
                let r = game.findCombinationNumber(game.volatileData.chords.playerTwo[i].x, game.volatileData.chords.playerTwo[i].y);
                if (r !== null) {
                    pTwo[r] = 1;
                }
            }

            let dataToSend = {"cmd": "syncAll", 'p1': pOne.join(''), 'p2': pTwo.join('')};

            clientBroker.actions.sendMsg(JSON.stringify(dataToSend));

        },
        showNewGame: function () {
            game.tpls.show(game.tpls.initNewGame);
        },
        startNewGame: function (type) {
            let trisBox = $('#trisBox').val();
            let playerOne = $('#playerOne').val();
            let playerTwo = $('#playerTwo').val();
            if (!trisBox)
                return alert('Devi necessariamente inserire il codice del tuo Robot per iniziare a giocare!');
            if (!playerOne)
                return alert('Giocatore UNO, mi manca il tuo nome!');
            if (!playerTwo)
                return alert('Giocatore DUE, mi manca il tuo nome!');
            if (playerOne == playerTwo) {
                return alert('Scegli un nome differente per il secondo giocatore!');
            }

            if (type) {
                game.status.easy = true;
            } else
                game.status.easy = false;
            game.volatileData.playerOne = playerOne;
            game.volatileData.playerTwo = playerTwo;
            clientBroker.actions.setTopic('iscola/tris/' + trisBox);
            clientBroker.actions.sendMsg(JSON.stringify({"cmd": "newGameWaitToStart", "trisBox": trisBox}));
            game.tpls.show(game.tpls.initNewGame2Step);

            for (let x = 0; x <= 2; x++) {
                for (let y = 0; y <= 2; y++) {
                    $('#x' + x + 'y' + y).removeClass('two').removeClass('pressed').removeClass('one');
                }
            }
        },
        checkCombinations: function (player) {
            /************************/
            //   x-y x-y x-y
            //   0-0 1-0 2-0     1 0 0 | 0 1 0 | 0 0 1 | 1 1 1 | 0 0 0 | 0 0 0 | 1 0 0 | 0 0 1
            //   0-1 1-1 2-1     1 0 0 | 0 1 0 | 0 0 1 | 0 0 0 | 1 1 1 | 0 0 0 | 0 1 0 | 0 1 0
            //   0-2 1-2 2-2     1 0 0 | 0 1 0 | 0 0 1 | 0 0 0 | 0 0 0 | 1 1 1 | 0 0 1 | 1 0 0



            var combination = null;
            for (let o in game.volatileData.combinations) {
                let complete = 0;
                for (let c in game.volatileData.combinations[o]) {
                    combination = game.volatileData.combinations[o][c];
                    for (let p in player) {
                        if (player[p].x == combination.x && player[p].y == combination.y)
                        {
                            complete++;
                        }
                    }
                }
                if (complete == 3) {
                    return o;
                }
            }
            return null;
        },
        checkIfWin: function () {
            if (game.volatileData.chords.playerOne.length < 3 && game.volatileData.chords.playerTwo.length < 3)
                return false;
            let winPlayerOne = game.actions.checkCombinations(game.volatileData.chords.playerOne);
            let winPlayerTwo = game.actions.checkCombinations(game.volatileData.chords.playerTwo);
            if (winPlayerOne || winPlayerTwo) {
                game.actions.victory();
                return true;
            }
            return false;
        },
        checkIfIsDraw: function () {
            if ((game.volatileData.chords.playerOne.length + game.volatileData.chords.playerTwo.length) == 9) {
                game.actions.gameOver();
                return true;
            }
            return false;
        },
        getQuestionById: function (id) {
            for (let i in game.config.questions) {
                if (parseInt(game.config.questions[i].id) == parseInt(id)) {
                    return i;
                }
            }
            return null;
        },
        setAsCorrectAnswer: function (idQuestion) {
            game.volatileData.answers++;
            game.volatileData.goodAnswer.push(idQuestion);
            console.log('corretta', '#x' + game.volatileData.actualChord.x + 'y' + game.volatileData.actualChord.y)
            if (game.volatileData.actualPlayer == 1) {
                game.volatileData.chords.playerOne.push(game.volatileData.actualChord);
                $('#x' + game.volatileData.actualChord.x + 'y' + game.volatileData.actualChord.y).removeClass('two').removeClass('pressed').addClass('one');

            } else
            {
                game.volatileData.chords.playerTwo.push(game.volatileData.actualChord);
                $('#x' + game.volatileData.actualChord.x + 'y' + game.volatileData.actualChord.y).removeClass('one').removeClass('pressed').addClass('two');
            }

            game.actions.showGoodAnswer();
            if (!game.actions.checkIfWin()) {

            }
        },
        setAsBadAnswer: function (idQuestion) {
            $('#x' + game.volatileData.actualChord.x + 'y' + game.volatileData.actualChord.y).removeClass('pressed');

            game.volatileData.answers--;
            game.volatileData.badAnswer.push(idQuestion);
            game.volatileData.livesLost++;
            game.actions.showBadAnswer();
            if (game.actions.checkIfIsDraw()) {
                console.log('mosse finite, finita in pareggio');

            }
        },
        answerToQuestion: function (idAnswer, idQuestion) {
            let questionId = game.actions.getQuestionById(idQuestion);
            if (game.config.questions[questionId]['type'] === 'free') {
                let answer = $('#questionAnswer').val();
                if (answer.trim().toLowerCase() == game.config.questions[questionId].right.trim().toLowerCase())
                {
                    game.actions.setAsCorrectAnswer(idQuestion);
                } else {
                    game.actions.setAsBadAnswer(idQuestion);
                }
            } else {
                if (parseInt(idAnswer) == parseInt(game.config.questions[questionId].right))
                {
                    game.actions.setAsCorrectAnswer(idQuestion);
                } else {
                    game.actions.setAsBadAnswer(idQuestion);
                }
            }
            game.volatileData.actualPlayer = (game.volatileData.actualPlayer == 1) ? 2 : 1;
        },
        getQuestion: function () {
            if (!game.config.questions.length || !game.volatileData.questionsRemain.length) {
                return null;
            }
            let i = Math.round(Math.random() * game.volatileData.questionsRemain.length)
            if (!game.volatileData.questionsRemain.hasOwnProperty(i))
                return game.actions.getQuestion();
            let q = game.volatileData.questionsRemain[i];
            let updateQuestion = [];
            for (let o in game.volatileData.questionsRemain) {
                if (o != i)
                    updateQuestion.push(game.volatileData.questionsRemain[o]);
            }
            game.volatileData.questionsRemain = updateQuestion;
            return q;
        },
        victory: function () {
            game.status.addStatus('victory');
            clientBroker.actions.sendMsg(JSON.stringify({"cmd": "victory"}));
            let tpl = $(game.tpls.victory)[0].outerHTML;
            tpl = tpl.replace('{goodAnswer}', game.volatileData.goodAnswer.length);
            tpl = tpl.replace('{badAnswer}', game.volatileData.badAnswer.length);
            tpl = tpl.replace('{totAnswer}', game.volatileData.badAnswer.length + game.volatileData.goodAnswer.length);
            let playerName = (game.volatileData.actualPlayer == 1) ? game.volatileData.playerOne : game.volatileData.playerTwo;
            tpl = tpl.replace('{player}', playerName);
            game.tpls.show(tpl);
        },
        gameOver: function (motive) {
            motive = motive || '';
            game.status.addStatus('gameOver');
            clientBroker.actions.sendMsg(JSON.stringify({"cmd": "gameOver"}));
            let tpl = $(game.tpls.gameOver)[0].outerHTML;
            let playerName = (game.volatileData.actualPlayer == 1) ? game.volatileData.playerOne : game.volatileData.playerTwo;
            tpl = tpl.replace('{player}', playerName);
            /*  tpl = tpl.replace('{goodAnswer}', game.volatileData.goodAnswer.length);
             tpl = tpl.replace('{badAnswer}', game.volatileData.badAnswer.length);
             tpl = tpl.replace('{totAnswer}', game.volatileData.badAnswer.length + game.volatileData.goodAnswer.length);*/
            game.tpls.show(tpl);
        },
        showGoodAnswer: function () {
            let tpl = game.tpls.goodStillAlive[0].outerHTML;
            let playerName = (game.volatileData.actualPlayer == 1) ? game.volatileData.playerOne : game.volatileData.playerTwo;
            let playerGame = (game.volatileData.actualPlayer == 1) ? game.volatileData.playerTwo : game.volatileData.playerOne;
            tpl = tpl.replace('{player}', playerName).replace('{playerGame}', playerGame);
            game.tpls.show(tpl);
            console.log('Risposta valida, invio messaggio al robot');
            clientBroker.actions.sendMsg(JSON.stringify({"cmd": "goodResponse", "player": game.volatileData.actualPlayer, "x": game.volatileData.actualChord.x, "y": game.volatileData.actualChord.y}));

        },
        showBadAnswer: function () {
            let tpl = game.tpls.badStillAlive[0].outerHTML;
            let playerName = (game.volatileData.actualPlayer == 1) ? game.volatileData.playerOne : game.volatileData.playerTwo;
            let playerGame = (game.volatileData.actualPlayer == 1) ? game.volatileData.playerTwo : game.volatileData.playerOne;
            tpl = tpl.replace('{player}', playerName).replace('{playerGame}', playerGame);
            game.tpls.show(tpl);
            console.log('Risposta sbagliata, invio messaggio al robot');
            clientBroker.actions.sendMsg(JSON.stringify({"cmd": "badResponse", "player": game.volatileData.actualPlayer, "x": game.volatileData.actualChord.x, "y": game.volatileData.actualChord.y}));
        },
        showQuestion: function (question) {
            let tpl = $(game.tpls.question)[0].outerHTML;
            tpl = tpl.replace('{title}', question.text);
            let description = '';
            if (question.type == 'free') {
                description = '<p class="row text-center" ><input type="text" id="questionAnswer" style="width:94%; color:black;"/></p><br/><a  class="button-game" style="width: 100%;" href="javascript:game.actions.answerToQuestion(null,' + question.id + ')"><span class="button-game-bg-left"></span><span class="button-game-bg-mid"><span>Invia</span></span><span class="button-game-bg-right"></span></a>';
                /* $('#btn-text').html('Invia');
                 $('#btn-text').attr('href', "javascript:game.actions.answerToQuestion(0," + question.id + ")");*/
            } else {
                let buttons = ['<ul class="unstyled">'];
                for (let i in question.answers) {
                    if (question.answers[i].text) {
                        buttons.push('<li><a  class="button-game" style="width: 100%;" href="javascript:game.actions.answerToQuestion(' + question.answers[i].id + ',' + question.id + ')"><span class="button-game-bg-left"></span><span class="button-game-bg-mid"><span>' + question.answers[i].text + '</span></span><span class="button-game-bg-right"></span></a></li>');
                    }

                }
                buttons.push('</ul>');
                description = buttons.join(' ');
            }

            tpl = tpl.replace('{description}', description);
            game.tpls.show(tpl);
        }
    }
}

clientBroker.init();
game.init();






