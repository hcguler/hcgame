import os
import json
import jpype
import requests
import sys

# Ayarlar
DATA_DIR = "data"
MIN_LEN = 3
MAX_LEN = 9
# Zemberek JAR yolu (Repodaki dosya)
ZEMBEREK_JAR = "libs/zemberek-full.jar" 

# YENİ VE SAĞLAM URL:
RAW_WORDLIST_URL = "https://raw.githubusercontent.com/ncarkaci/turkish_word_set/master/word_set.txt"

def download_file(url):
    print(f"Ham veri indiriliyor: {url}")
    try:
        response = requests.get(url, timeout=30)
        if response.status_code == 200:
            # Gelen veri satır satır okunuyor
            return response.text.splitlines()
        else:
            print(f"Veri indirilemedi! Kod: {response.status_code}")
            sys.exit(1)
    except Exception as e:
        print(f"İndirme hatası: {e}")
        sys.exit(1)

def main():
    # 1. Klasör Hazırlığı
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)

    # 2. JAR Dosyası Kontrolü
    jar_path = os.path.abspath(ZEMBEREK_JAR)
    print(f"JAR dosyası aranıyor: {jar_path}")

    if not os.path.exists(jar_path):
        print(f"HATA: {ZEMBEREK_JAR} bulunamadı!")
        print("Lütfen 'libs/zemberek-full.jar' dosyasını repoya yüklediğinizden emin olun.")
        sys.exit(1)
    
    print("JVM başlatılıyor...")
    try:
        if not jpype.isJVMStarted():
            jpype.startJVM(
                jpype.getDefaultJVMPath(),
                f"-Djava.class.path={jar_path}",
                "-ea"
            )
    except Exception as e:
        print(f"JVM Başlatma Hatası: {e}")
        sys.exit(1)

    # 3. Zemberek Yükleme
    try:
        TurkishMorphology = jpype.JClass("zemberek.morphology.TurkishMorphology")
        morphology = TurkishMorphology.createWithDefaults()
        print("Zemberek motoru hazır.")
    except Exception as e:
        print(f"Zemberek sınıfı yüklenemedi: {e}")
        sys.exit(1)

    # 4. Kelimeleri İşle
    raw_words = download_file(RAW_WORDLIST_URL)
    word_buckets = {i: set() for i in range(MIN_LEN, MAX_LEN + 1)}
    
    print(f"Toplam {len(raw_words)} ham kelime işleniyor... (Bu işlem biraz sürebilir)")
    
    count = 0
    valid_count = 0
    
    for word in raw_words:
        word = word.strip().lower()
        length = len(word)

        if not (MIN_LEN <= length <= MAX_LEN):
            continue
        
        # Boşluk ve yasaklı karakter filtresi (Oyun için temiz veri)
        if any(char in word for char in " .'0123456789-_/"):
            continue

        try:
            results = morphology.analyze(word)
            # Analiz sonucu varsa ve kelime 'Bilinmeyen' değilse
            if results and results.getAnalysisResults():
                item = results.getAnalysisResults()[0].getItem()
                if not item.isUnknown():
                    word_buckets[length].add(word)
                    valid_count += 1
        except:
            continue
        
        count += 1
        if count % 5000 == 0:
            print(f"{count} kelime tarandı... (Bulunan geçerli kelime: {valid_count})")

    # 5. Kaydet
    print("Dosyalar kaydediliyor...")
    for length, words in word_buckets.items():
        filename = os.path.join(DATA_DIR, f"words{length}.json")
        sorted_list = sorted(list(words), key=lambda x: (len(x), x))
        
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(sorted_list, f, ensure_ascii=False, indent=2)
            
        print(f"-> {filename} : {len(sorted_list)} kelime")
        
    print("Tüm işlemler başarıyla tamamlandı.")
    if jpype.isJVMStarted():
        jpype.shutdownJVM()

if __name__ == "__main__":
    main()
