/*
  Monitoramento de Vinherias - CP5 Edge Computing
  Grupo PentaCode - Turma 1ESPH - FIAP

  Sensores : LDR (luminosidade) + DHT (temperatura e umidade)
  Saidas   : LED azul da placa (GPIO 2, pisca enquanto houver qualquer alerta)
             LED RGB (semaforo do ambiente: verde, amarelo ou vermelho)
             LED da lampada (intensidade por PWM)
             buzzer (alerta sonoro)
             display LCD 16x2 I2C (leituras e estado no proprio equipamento)
             LEDs do ar condicionado e do umidificador (atuadores)

  Cada anomalia tem uma cor, um ritmo de piscada e um som proprios:
    temperatura  -> vermelho, piscada rapida, som agudo
    umidade      -> amarelo,  piscada media,  som medio
    luminosidade -> amarelo,  piscada lenta,  som grave

  Sem alerta o LED RGB fica verde fixo. Vermelho fica reservado para a
  temperatura, a anomalia que mais rapido estraga o vinho; umidade e
  luminosidade agem devagar e dividem o amarelo, diferenciadas pelo ritmo
  da piscada, pelo som e pelo display.

  Os alertas NAO sao decididos pelo ESP32: o dashboard compara os valores com
  os limites de cada dispositivo e envia os comandos. O ESP32 executa e informa
  seu estado de volta, para que a tela mostre o que o equipamento realmente fez.
*/

#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// ===================== CONFIGURACAO =====================

// TROCAR AQUI: DHT22 na simulacao do Wokwi, DHT11 no laboratorio (hands-on)
#define TIPO_DHT DHT22

const char* default_SSID = "Wokwi-GUEST";           // Rede Wi-Fi
const char* default_PASSWORD = "";                  // Senha do Wi-Fi
const char* default_BROKER_MQTT = "54.166.164.57";   // IP publico da EC2 - ATUALIZAR
const int default_BROKER_PORT = 1883;

const char* default_TOPICO_SUBSCRIBE = "/TEF/lamp001/cmd";   // Comandos vindos do FIWARE
const char* default_TOPICO_PUBLISH = "/TEF/lamp001/attrs";   // Atributos enviados ao FIWARE
const char* default_ID_MQTT = "fiware_001";
const char* topicPrefix = "lamp001";                          // Prefixo dos comandos

// Pinos do LED RGB (catodo comum: HIGH acende cada cor)
const int PINO_R = 25;
const int PINO_G = 26;
const int PINO_B = 27;

const int PINO_LDR = 34;     // Sensor de luminosidade (ADC)
const int PINO_DHT = 15;     // Sensor DHT (temperatura e umidade)
const int PINO_BUZZER = 4;   // Buzzer (alerta sonoro)
const int PINO_AC = 18;      // Ar condicionado
const int PINO_UMID = 19;    // Umidificador
const int PINO_LAMPADA = 23; // Lampada do ambiente (PWM)
const int PINO_LED_AZUL = 2;  // LED azul da propria placa: pisca em qualquer alerta

const unsigned long INTERVALO_PUBLICACAO = 5000;  // Nao usar menos de 2000 (limite do DHT)
const unsigned long INTERVALO_LCD = 1000;         // Atualizacao do display

// Display 16x2 no endereco I2C padrao (SDA 21, SCL 22)
LiquidCrystal_I2C lcd(0x27, 16, 2);

// ===================== ESTADO =====================

char* SSID = const_cast<char*>(default_SSID);
char* PASSWORD = const_cast<char*>(default_PASSWORD);
char* BROKER_MQTT = const_cast<char*>(default_BROKER_MQTT);
int BROKER_PORT = default_BROKER_PORT;
char* TOPICO_SUBSCRIBE = const_cast<char*>(default_TOPICO_SUBSCRIBE);
char* TOPICO_PUBLISH = const_cast<char*>(default_TOPICO_PUBLISH);
char* ID_MQTT = const_cast<char*>(default_ID_MQTT);

WiFiClient espClient;
PubSubClient MQTT(espClient);
DHT dht(PINO_DHT, TIPO_DHT);

enum TipoAlerta { NENHUM, TEMPERATURA, UMIDADE, LUMINOSIDADE };

TipoAlerta alertaAtivo = NENHUM;
char estadoLampada = '0';     // '1' ligada, '0' desligada
int intensidadeLuz = 0;       // 0 apagada, 1 baixa, 2 media, 3 alta
bool arCondicionado = false;
bool umidificador = false;

bool ledAceso = false;
unsigned long ultimaPublicacao = 0;
unsigned long ultimaPiscada = 0;
unsigned long ultimoLCD = 0;

// Ultimas leituras, guardadas para o display nao reler o sensor a cada segundo
float ultimaTemperatura = NAN;
float ultimaUmidade = NAN;
int ultimaLuminosidade = 0;

// ===================== LED RGB =====================

// Brilho de cada nivel de intensidade (PWM de 0 a 255)
int brilhoDaIntensidade() {
    switch (intensidadeLuz) {
        case 1:  return 40;    // baixa
        case 2:  return 120;   // media
        case 3:  return 255;   // alta
        default: return 0;     // apagada
    }
}

// Acende a combinacao de cores no brilho indicado (0 a 255).
void setCor(bool r, bool g, bool b, int brilho) {
    analogWrite(PINO_R, r ? brilho : 0);
    analogWrite(PINO_G, g ? brilho : 0);
    analogWrite(PINO_B, b ? brilho : 0);
}

void apagaLed() { setCor(false, false, false, 0); }

// Vermelho para temperatura, amarelo para o resto. Sempre no brilho maximo,
// para ser visto de longe.
void corDoAlerta() {
    switch (alertaAtivo) {
        case TEMPERATURA:  setCor(true, false, false, 255); break;  // vermelho
        case UMIDADE:      setCor(true, true, false, 255);  break;  // amarelo
        case LUMINOSIDADE: setCor(true, true, false, 255);  break;  // amarelo
        default:           apagaLed();                      break;
    }
}

// Sem alerta, o LED RGB fica verde: ambiente dentro dos limites.
void corNormal() { setCor(false, true, false, 255); }

// A lampada tem LED proprio, independente dos alertas.
void mostraEstadoLampada() {
    int brilho = (estadoLampada == '1') ? brilhoDaIntensidade() : 0;
    analogWrite(PINO_LAMPADA, brilho);
}

int intervaloPiscada() {
    switch (alertaAtivo) {
        case TEMPERATURA:  return 200;   // piscada rapida
        case UMIDADE:      return 500;   // piscada media
        case LUMINOSIDADE: return 1000;  // piscada lenta
        default:           return 0;
    }
}

int frequenciaBuzzer() {
    switch (alertaAtivo) {
        case TEMPERATURA:  return 2000;  // som agudo
        case UMIDADE:      return 1000;  // som medio
        case LUMINOSIDADE: return 500;   // som grave
        default:           return 0;
    }
}

const char* nomeAlerta() {
    switch (alertaAtivo) {
        case TEMPERATURA:  return "temperatura";
        case UMIDADE:      return "umidade";
        case LUMINOSIDADE: return "luminosidade";
        default:           return "normal";
    }
}

// ===================== DISPLAY =====================

// Linha 1: leituras dos sensores. Linha 2: estado do ambiente e atuadores.
// Assim o equipamento informa sozinho, sem depender do dashboard.
void atualizaLCD() {
    lcd.setCursor(0, 0);
    if (isnan(ultimaTemperatura) || isnan(ultimaUmidade)) {
        lcd.print("Lendo sensores..");
    } else {
        lcd.printf("%4.1fC %2.0f%% L%3d", ultimaTemperatura, ultimaUmidade, ultimaLuminosidade);
    }

    lcd.setCursor(0, 1);
    if (alertaAtivo != NENHUM) {
        // Em alerta, o display mostra o problema em destaque
        lcd.print("ALERTA: ");
        lcd.print(nomeAlerta());
        lcd.print("        ");
    } else {
        // Em operacao normal, mostra quais atuadores estao ligados
        lcd.print("OK ");
        lcd.print(arCondicionado ? "AC " : "   ");
        lcd.print(umidificador ? "UM " : "   ");
        lcd.printf("Luz%d    ", intensidadeLuz);
    }
}

// ===================== ATUADORES =====================

void setArCondicionado(bool ligado) {
    arCondicionado = ligado;
    digitalWrite(PINO_AC, ligado ? HIGH : LOW);
    Serial.print("- Ar condicionado: ");
    Serial.println(ligado ? "LIGADO" : "DESLIGADO");
}

void setUmidificador(bool ligado) {
    umidificador = ligado;
    digitalWrite(PINO_UMID, ligado ? HIGH : LOW);
    Serial.print("- Umidificador: ");
    Serial.println(ligado ? "LIGADO" : "DESLIGADO");
}

void setIntensidadeLuz(int nivel) {
    intensidadeLuz = constrain(nivel, 0, 3);
    estadoLampada = (intensidadeLuz > 0) ? '1' : '0';
    mostraEstadoLampada();
    Serial.print("- Intensidade da luz: ");
    Serial.println(intensidadeLuz);
}

// ===================== SETUP =====================

void setup() {
    pinMode(PINO_R, OUTPUT);
    pinMode(PINO_G, OUTPUT);
    pinMode(PINO_B, OUTPUT);
    pinMode(PINO_BUZZER, OUTPUT);
    pinMode(PINO_AC, OUTPUT);
    pinMode(PINO_UMID, OUTPUT);
    pinMode(PINO_LAMPADA, OUTPUT);
    pinMode(PINO_LED_AZUL, OUTPUT);
    digitalWrite(PINO_LED_AZUL, LOW);
    corNormal();
    mostraEstadoLampada();
    digitalWrite(PINO_AC, LOW);
    digitalWrite(PINO_UMID, LOW);

    Serial.begin(115200);

    lcd.init();
    lcd.backlight();
    lcd.setCursor(0, 0);
    lcd.print("Vinheria PentaC");
    lcd.setCursor(0, 1);
    lcd.print("Conectando...");

    dht.begin();
    initWiFi();
    initMQTT();
    delay(3000);
    lcd.clear();
    publicaAtributos();
}

void initWiFi() {
    Serial.println("------Conexao WI-FI------");
    Serial.print("Conectando-se na rede: ");
    Serial.println(SSID);
    reconectWiFi();
}

void initMQTT() {
    MQTT.setServer(BROKER_MQTT, BROKER_PORT);
    MQTT.setCallback(mqtt_callback);
}

// ===================== LOOP =====================

void loop() {
    verificaConexoes();
    MQTT.loop();

    atualizaAlerta();  // precisa rodar sempre: e o que faz o LED piscar

    if (millis() - ultimoLCD >= INTERVALO_LCD) {
        ultimoLCD = millis();
        atualizaLCD();
    }

    if (millis() - ultimaPublicacao >= INTERVALO_PUBLICACAO) {
        ultimaPublicacao = millis();
        publicaAtributos();
    }
}

// ===================== ALERTAS =====================

// Pisca o LED na cor da anomalia e toca o buzzer no mesmo ritmo.
// Usa millis() em vez de delay() para nao travar o MQTT: com delay() os
// comandos vindos do dashboard so chegariam entre uma piscada e outra.
void atualizaAlerta() {
    if (alertaAtivo == NENHUM) {
        return;
    }

    if (millis() - ultimaPiscada >= (unsigned long)intervaloPiscada()) {
        ultimaPiscada = millis();
        ledAceso = !ledAceso;
        digitalWrite(PINO_LED_AZUL, ledAceso ? HIGH : LOW);

        if (ledAceso) {
            corDoAlerta();
            tone(PINO_BUZZER, frequenciaBuzzer());
        } else {
            apagaLed();
            noTone(PINO_BUZZER);
        }
    }
}

void ativaAlerta(TipoAlerta tipo) {
    alertaAtivo = tipo;
    ultimaPiscada = 0;  // comeca a piscar imediatamente
    ledAceso = false;
    Serial.print("! Alerta ativado: ");
    Serial.println(nomeAlerta());
    atualizaLCD();
}

void desativaAlerta() {
    alertaAtivo = NENHUM;
    noTone(PINO_BUZZER);
    digitalWrite(PINO_LED_AZUL, LOW);
    corNormal();
    Serial.println("- Alerta desativado, valores normalizados");
    atualizaLCD();
}

// ===================== MQTT =====================

void mqtt_callback(char* topic, byte* payload, unsigned int length) {
    String msg;
    for (unsigned int i = 0; i < length; i++) {
        msg += (char)payload[i];
    }
    Serial.print("- Comando recebido: ");
    Serial.println(msg);

    String prefixo = String(topicPrefix) + "@";

    // Lampada
    if (msg.equals(prefixo + "on|")) {
        estadoLampada = '1';
        if (intensidadeLuz == 0) intensidadeLuz = 3;
        mostraEstadoLampada();
        Serial.println("- Lampada LIGADA");
    } else if (msg.equals(prefixo + "off|")) {
        estadoLampada = '0';
        intensidadeLuz = 0;
        mostraEstadoLampada();
        Serial.println("- Lampada DESLIGADA");

    // Alertas
    } else if (msg.equals(prefixo + "alerttemp|")) {
        ativaAlerta(TEMPERATURA);
    } else if (msg.equals(prefixo + "alerthum|")) {
        ativaAlerta(UMIDADE);
    } else if (msg.equals(prefixo + "alertlum|")) {
        ativaAlerta(LUMINOSIDADE);
    } else if (msg.equals(prefixo + "alertoff|")) {
        desativaAlerta();

    // Atuadores
    } else if (msg.equals(prefixo + "acon|")) {
        setArCondicionado(true);
    } else if (msg.equals(prefixo + "acoff|")) {
        setArCondicionado(false);
    } else if (msg.equals(prefixo + "umidon|")) {
        setUmidificador(true);
    } else if (msg.equals(prefixo + "umidoff|")) {
        setUmidificador(false);
    } else if (msg.equals(prefixo + "luz0|")) {
        setIntensidadeLuz(0);
    } else if (msg.equals(prefixo + "luz1|")) {
        setIntensidadeLuz(1);
    } else if (msg.equals(prefixo + "luz2|")) {
        setIntensidadeLuz(2);
    } else if (msg.equals(prefixo + "luz3|")) {
        setIntensidadeLuz(3);
    } else {
        return;  // comando desconhecido: nao republica a toa
    }

    publicaAtributos();
    atualizaLCD();
}

void verificaConexoes() {
    if (!MQTT.connected()) reconnectMQTT();
    reconectWiFi();
}

void reconectWiFi() {
    if (WiFi.status() == WL_CONNECTED) return;
    // Canal 6 fixo: no Wokwi evita varrer todos os canais e acelera a conexao
    WiFi.begin(SSID, PASSWORD, 6);
    while (WiFi.status() != WL_CONNECTED) {
        delay(100);
        Serial.print(".");
    }
    Serial.println();
    Serial.print("Conectado na rede. IP obtido: ");
    Serial.println(WiFi.localIP());
}

void reconnectMQTT() {
    while (!MQTT.connected()) {
        Serial.print("* Tentando se conectar ao Broker MQTT: ");
        Serial.println(BROKER_MQTT);
        if (MQTT.connect(ID_MQTT)) {
            Serial.println("Conectado com sucesso ao broker MQTT!");
            MQTT.subscribe(TOPICO_SUBSCRIBE);
        } else {
            Serial.println("Falha ao conectar. Nova tentativa em 2s");
            delay(2000);
        }
    }
}

// ===================== SENSORES =====================

int lerLuminosidade() {
    return map(analogRead(PINO_LDR), 0, 4095, 0, 100);
}

// Envia todos os atributos numa unica mensagem Ultralight 2.0:
// s|on|l|75|t|24.5|h|60|a|temperatura
void publicaAtributos() {
    ultimaLuminosidade = lerLuminosidade();
    ultimaTemperatura = dht.readTemperature();
    ultimaUmidade = dht.readHumidity();

    String payload = "s|";
    payload += (estadoLampada == '1') ? "on" : "off";
    payload += "|l|" + String(ultimaLuminosidade);

    // O DHT devolve NaN quando a leitura falha: nesse caso os atributos sao omitidos
    if (!isnan(ultimaTemperatura) && !isnan(ultimaUmidade)) {
        payload += "|t|" + String(ultimaTemperatura, 1);
        payload += "|h|" + String(ultimaUmidade, 1);
    } else {
        Serial.println("! Falha na leitura do DHT - enviando so estado e luminosidade");
    }

    payload += "|a|" + String(nomeAlerta());

    MQTT.publish(TOPICO_PUBLISH, payload.c_str());
    Serial.print("- Enviado ao broker: ");
    Serial.println(payload);
}
