// LIBRERIE INTERNE PER CONSENTIRE IL REBOOT
#include <dummy.h>
#include <esp_int_wdt.h>
#include <esp_task_wdt.h>

// LIBRERIE PER MPR121
#include <Wire.h>
#include "Adafruit_MPR121.h"
#ifndef _BV
#define _BV(bit) (1 << (bit)) 
#endif
Adafruit_MPR121 cap = Adafruit_MPR121();
uint16_t lasttouched = 0;
uint16_t currtouched = 0;

// LIBRERIE PER OLED
#include "SSD1306.h" // alias for `#include "SSD1306Wire.h"'

// LIBRERIE PER CONNESSIONE E MQTT
#include "EspMQTTClient.h"
const char* wifiSSID = ""; // SSID DELLA TUA RETE
const char* wifiPASS = ""; // PASSWORD DELLA TUA RETE
const char* mqttBrokerServer = "broker.vikstech.com";
int mqttBrokerPort = 2884;


// LIBRERIA PER GESTIRE JSON
#include "ArduinoJson.h"

// ID DEL ROBOT (OGNI ROBOT DEVE AVERE UN ID UNICO)
String trisBox = "iscola2";

// WIFI E MQTT SETTING
EspMQTTClient client(
  wifiSSID, //SSID della WIFI
  wifiPASS, // PASS della WIFI
  mqttBrokerServer,  // MQTT Broker server ip
  "",   // User - Can be omitted if not needed
  "",   // Password - Can be omitted if not needed
  "iscola2",     // Client name that uniquely identify your device
  mqttBrokerPort              // The MQTT port, default to 1883. this line can be omitted
);
int maxSecondOfWifiInactivity = 30;
int secondOfWifiInactivity = 0;

// OLED SETTING
//SSD1306  display(0x3c, 5, 4);

int inquestion = 0;

int minTreshold = 10;
int maxTreshold = 70;
//y, x
int chordsIN[9][2] = { {0,0},{0,1},{0,2},{1,0},{1,1},{1,2},{2,0},{2,1},{2,2} };
//int chordsIN[9][2] = {{0,0},{1,0},{2,0},{0,1},{1,1},{2,1},{0,2},{1,2},{2,2}};
int chordsOUT1[3][3] = { {25,27,12},{4,2,32},{19,18,17} };// y = ( x,x,x)
int chordsOUT2[3][3] = { {26,14,13},{0,15,33},{23,5,16} }; // valido sino al 16 
int chordsStatus[3][3][1] = { {{0},{0},{0}},{{0},{0},{0}},{{0},{0},{0}} };

int x = 0;
int y = 0;
int actualPlayer = 0;

int letters[21][9] = {
  {0,1,0,1,1,1,1,0,1}, //A - 0
  {1,1,1,1,1,0,1,1,1}, //B - 1
  {1,1,1,1,0,0,1,1,1}, //C - 2
  {1,1,0,1,0,1,1,1,0}, //D - 3 
  {1,1,1,1,1,1,1,1,1}, //E - 4
  {1,1,1,1,1,0,1,0,0}, //F - 5 
  {1,1,0,1,0,1,1,1,1}, //G - 6 
  {1,0,1,1,1,1,1,0,1}, //H - 7 
  {0,1,0,0,1,0,0,1,0}, //I - 8
  {1,0,0,1,0,0,1,1,1}, //L - 9 
  {1,1,1,1,0,1,1,0,1}, //M - 10 
  {1,0,1,1,1,1,1,1,1}, //N - 11
  {1,1,1,1,0,1,1,1,1}, //O - 12 
  {1,1,1,1,1,1,1,0,0}, //P - 13
  {1,1,1,1,1,1,1,1,1}, //Q - 14
  {1,1,1,1,1,1,1,0,1}, //R - 15
  {1,1,1,0,1,1,1,1,0}, //S - 16
  {1,1,1,0,1,0,0,1,0}, //T - 17
  {1,0,1,1,0,1,1,1,1}, //U - 18
  {1,0,1,1,0,1,0,1,0}, //V - 19
  {1,0,1,0,1,0,1,0,1} //X - 20

};



// INIZIALIZZAZIONE DEL PROGRAMMA
void setup() {
  // INIZIALIZZO IL DISPLAY
  //  initDisplay();
  // AVVIO DELLA PORTA SERIALE
  Serial.begin(115200, SERIAL_8N1);
  while (!Serial)
    delay(50);
  //  printToDisplay("Strt Sys");
  client.enableDebuggingMessages();
  // INIT MPR121
  if (!cap.begin(0x5A)) {
    Serial.println("MPR121 not found, check wiring?");
    while (1);
  }
  Serial.println("MPR121 found!");
  lightOffAll();
  initFlash();
}
void flashLetter(int id) {
  int inX = 0;
  int inY = 0;

  for (int i = 0; i < 9; i++) {
    inX = chordsIN[i][0];
    inY = chordsIN[i][1];
    digitalWrite(chordsOUT1[inX][inY], letters[id][i]);
  }
  delay(1000);

}

void flashConnected() {
  lightOffAll();
  for (int i = 0; i < 9; i++) {
    digitalWrite(chordsOUT1[chordsIN[i][0]][chordsIN[i][1]], HIGH);
  }
  delay(100);
  for (int i = 0; i < 9; i++) {
    digitalWrite(chordsOUT1[chordsIN[i][0]][chordsIN[i][1]], LOW);
  }
  delay(100);
}

void flashDisconnected() {
  lightOffAll();
  for (int i = 0; i < 9; i++) {
    digitalWrite(chordsOUT2[chordsIN[i][0]][chordsIN[i][1]], HIGH);
  }
  delay(100);
  for (int i = 0; i < 9; i++) {
    digitalWrite(chordsOUT2[chordsIN[i][0]][chordsIN[i][1]], LOW);
  }
  delay(100);
}

void lightOffAll() {
  for (x = 0; x < 3; x++) {
    for (y = 0; y < 3; y++) {
      pinMode(chordsOUT1[y][x], OUTPUT);
      pinMode(chordsOUT2[y][x], OUTPUT);
      digitalWrite(chordsOUT2[y][x], LOW);
      digitalWrite(chordsOUT1[y][x], LOW);
    }
  }
}
void lightOnAll() {
  for (x = 0; x < 3; x++) {
    for (y = 0; y < 3; y++) {
      pinMode(chordsOUT1[y][x], OUTPUT);
      pinMode(chordsOUT2[y][x], OUTPUT);
      digitalWrite(chordsOUT2[y][x], HIGH);
      digitalWrite(chordsOUT1[y][x], HIGH);
    }
  }
}

void flashVinto() {
  lightOffAll();

  int writelett[5] = { 19, 8, 11, 17, 12 };
  for (int i = 0; i < 5; i++) {
    flashLetter(writelett[i]);
  }
}

void flashPerso() {
  lightOffAll();
  int writelett[5] = { 13, 4, 15, 16, 12 };
  for (int i = 0; i < 5; i++) {
    flashLetter(writelett[i]);
  }
}

void flashClock() {
  lightOffAll();
  int a[8] = { 0,1,2,5,8,7,6,3 };
  digitalWrite(chordsOUT1[chordsIN[4][0]][chordsIN[4][1]], HIGH);
  for (int o = 0; o <= 2; o++) {
    for (int i = 0; i < 8; i++) {
      digitalWrite(chordsOUT1[chordsIN[a[i]][0]][chordsIN[a[i]][1]], HIGH);
      delay(50);
      digitalWrite(chordsOUT1[chordsIN[a[i]][0]][chordsIN[a[i]][1]], LOW);
    }
  }
  for (int o = 0; o <= 2; o++) {
    for (int i = 7; i >= 0; i--) {
      digitalWrite(chordsOUT2[chordsIN[a[i]][0]][chordsIN[a[i]][1]], HIGH);
      delay(50);
      digitalWrite(chordsOUT2[chordsIN[a[i]][0]][chordsIN[a[i]][1]], LOW);
    }
  }
}

void initFlash() {
  lightOffAll();
  int a[9] = { 0,1,2,5,4,3,6,7,8 };
  for (int i = 0; i < 9; i++) {
    digitalWrite(chordsOUT1[chordsIN[a[i]][0]][chordsIN[a[i]][1]], HIGH);
    delay(50);
    digitalWrite(chordsOUT1[chordsIN[a[i]][0]][chordsIN[a[i]][1]], LOW);
  }
  for (int i = 8; i >= 0; i--) {
    digitalWrite(chordsOUT2[chordsIN[a[i]][0]][chordsIN[a[i]][1]], HIGH);
    delay(50);
    digitalWrite(chordsOUT2[chordsIN[a[i]][0]][chordsIN[a[i]][1]], LOW);
  }
  flashClock();

  //flashVinto();
}

void testMode() {
  int i = getTouchedId();
  if (i != 99) {
    int y = chordsIN[i][0];
    int x = chordsIN[i][1];
    Serial.println(String(x) + " - " + String(y) + " = " + String(chordsOUT1[y][x]) + " = " + String(chordsOUT2[y][x]));
    digitalWrite(chordsOUT1[y][x], HIGH);
    digitalWrite(chordsOUT2[y][x], HIGH);
  }
}

void loop() {
  /*testMode();
  return;*/
  // VERIFICA RICEZIONE MESSAGGI DA MQTT
  client.loop();
  if (client.isConnected()) {
    int i = getTouchedId();
    if (i != 99) {
      int y = chordsIN[i][0];
      int x = chordsIN[i][1];
      if (chordsStatus[y][x][0] == 0 && inquestion == 0) {
        showQuest(1, x, y);
      }
    }
  }
  else {
    flashDisconnected();
    if (secondOfWifiInactivity >= maxSecondOfWifiInactivity) {
      printToDisplay("RESET");
      hard_restart();
    }

    secondOfWifiInactivity++;
    printToDisplay("NoWiFi" + String(secondOfWifiInactivity));
    delay(1000);
  }
}


int getTouchedId() {
  currtouched = cap.touched();
  for (uint8_t i = 0; i < 9; i++) {
    // it if *is* touched and *wasnt* touched before, alert!
    if ((currtouched & _BV(i)) && !(lasttouched & _BV(i))) {
      // Serial.print(i); Serial.println(" touched");
      return i;
    }
    // if it *was* touched and now *isnt*, alert!
    if (!(currtouched & _BV(i)) && (lasttouched & _BV(i))) {
      // Serial.print(i); Serial.println(" released");
    }
  }
  lasttouched = currtouched;
  return 99;
}

void _loop() {
  /*testMode();
  return;*/
  // VERIFICA RICEZIONE MESSAGGI DA MQTT
  client.loop();
  if (client.isConnected()) {
    int i = getTouchedId();
    if (i != 99) {
      int x = chordsIN[i][0];
      int y = chordsIN[i][1];
      if (chordsStatus[y][x][0] == 0 && inquestion == 0) {
        showQuest(1, x, y);
      }
    }
  }
  else {
    flashDisconnected();
    if (secondOfWifiInactivity >= maxSecondOfWifiInactivity) {
      printToDisplay("RESET");
      hard_restart();
    }

    secondOfWifiInactivity++;
    printToDisplay("NoWiFi" + String(secondOfWifiInactivity));
    delay(1000);
  }
}





void initDisplay()
{
  // DISABILITATO PER MANCANZA DI PIN LIBERI
  /*
  display.init();
  display.flipScreenVertically();
  display.setFont(ArialMT_Plain_24);*/
}

void printToDisplay(String val)
{
  // DISABILITATO PER MANCANZA DI PIN LIBERI
  /*
  display.clear();
  display.setColor(WHITE);
  display.setTextAlignment(TEXT_ALIGN_CENTER);
  display.drawString(64, 15, val);
  display.setFont(ArialMT_Plain_24);
  display.display();*/
}
void onConnectionEstablished()
{
  printToDisplay("Connected");
  delay(2000);
  printToDisplay("ID: " + trisBox);
  client.subscribe("iscola/tris/" + trisBox, [](const String & payload) {
    Serial.println(payload);
    DynamicJsonDocument doc(1024);
    deserializeJson(doc, payload);
    JsonObject obj = doc.as<JsonObject>();
    dispatchCommand(obj);

  });
  client.publish("iscola/tris/" + trisBox, "{\"cmd\":\"presence\",\"trisBox\":\"" + trisBox + "\"}");
  flashConnected();
}

void sendToBroker(String cmd) {
  Serial.println("invio " + cmd);
  printToDisplay("SendToWeb");
  client.publish("iscola/tris/" + trisBox, cmd);
}

void dispatchCommand(JsonObject obj) {
  Serial.println("ricevuto" + obj["cmd"].as<String>());
  String cmd = obj["cmd"].as<String>();

  // RESET - START NEW GAME
  if (cmd == "newGameWaitToStart") {
    Serial.println("ENABLE TO START");
    inquestion = 0;
    printToDisplay("Sync");
    startGame();
  }
  else if (cmd == "gameStartedAck") {
    Serial.println("ACK + player actual");
    printToDisplay("start_game_ack");
    actualPlayer = obj["actualPlayer"].as<int>();
    inquestion = 0;
  }
  else if (cmd == "gameOver") {
    Serial.println("GAME OVER");
    inquestion = 0;
    printToDisplay("GAMEOVER");
    flashPerso();
  }
  else if (cmd == "victory") {
    Serial.println("HAI VINTO");
    inquestion = 0;
    printToDisplay("HAIVINTO!");
    flashVinto();
  }
  else if (cmd == "syncAll") {
    Serial.println("ricevuto"); 
    int i = 0;
    String p1 = obj["p1"].as<String>();
    String p2 = obj["p2"].as<String>();
    int x1 = 0;
    int y1 = 0;
    for (i = 0; i< 9; i++) {
      y1 = chordsIN[i][0];
      x1 = chordsIN[i][1];
      
      if ((int) p1.charAt(i) == 49){
        digitalWrite(chordsOUT1[y1][x1], HIGH);
      }else{           
        digitalWrite(chordsOUT1[y1][x1], LOW);
      }
        
      if ((int) p2.charAt(i) == 49)
        digitalWrite(chordsOUT2[y1][x1], HIGH);
      else
        digitalWrite(chordsOUT2[y1][x1], LOW);
      
      
      
    }
  }
  else if (cmd == "goodResponse") {
    Serial.println("GOOD RESPONSE");
    inquestion = 0;
    printToDisplay("GIUSTO!");
    int x = obj["x"].as<int>();
    int y = obj["y"].as<int>();
    actualPlayer = obj["player"].as<int>();
    if (actualPlayer == 1) {
      digitalWrite(chordsOUT1[y][x], HIGH);
    }
    else {
      digitalWrite(chordsOUT2[y][x], HIGH);
    }
    chordsStatus[y][x][0] = 1;

  }
  else if (cmd == "badResponse") {
    Serial.println("BAD RESPONSE");
    inquestion = 0;
    printToDisplay("SBAGLIATO!");

  }
}

void startGame() {

  for (x = 0; x < 3; x++) {
    for (y = 0; y < 3; y++) {
      Serial.println("imposto " + String(chordsOUT1[y][x]) + " a out low");
      pinMode(chordsOUT1[y][x], OUTPUT);
      digitalWrite(chordsOUT1[y][x], LOW);
      pinMode(chordsOUT2[y][x], OUTPUT);
      digitalWrite(chordsOUT2[y][x], LOW);
      chordsStatus[y][x][0] = 0;
    }
  }
  sendToBroker("{\"cmd\":\"newGameStarted\",\"trisBox\":\"" + trisBox + "\"}");
}

void showQuest(int argoument, int x, int y) {
  Serial.println("quest req");
  if (inquestion == 0) {
    Serial.println("SEND TO WEB");
    inquestion = 1;
    sendToBroker("{\"cmd\":\"question\",\"trisBox\":\"" + trisBox + "\",\"ambit\":1, \"x\":" + x + ",\"y\":" + y + "}");
  }
}

void hard_restart() {
  esp_task_wdt_init(1, true);
  esp_task_wdt_add(NULL);
  while (true);
}
