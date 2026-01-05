import os
import json
import jpype
import requests
import sys

# Ayarlar
DATA_DIR = "data"
MIN_LEN = 3
MAX_LEN = 9
# Zemberek JAR yolu (GitHub Actions ortamına göre ayarlandı)
ZEMBEREK_JAR = "libs/zemberek-full.jar" 

# Ham kelime listesi kaynağı (Vngrs TDK Listesi - Popüler ve Kapsamlı)
RAW_WORDLIST_URL = "https://raw.githubusercontent.com/vngrs/turkish-wordlist/master/compounds.txt"
# Alternatif (Daha geniş corpus): "https://raw.githubusercontent.com/ncarkaci/turkish_word_set/master/word_set.txt"

def download_file(url):
    print(f"Ham veri indiriliyor: {url}")
    response = requests.get(url)
    if response.status_code == 200:
        return response.text.splitlines()
    else:
        print("Veri indirilemedi!")
        sys.exit(1)

def main():
    # 1. Klasör Hazırlığı
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)
        print(f"'{DATA_DIR}' klasörü oluşturuldu.")

    # 2. JVM Başlatma (Zemberek için)
    if not os.path.exists(ZEMBEREK_JAR):
        print(f"HATA: {ZEMBEREK_JAR} bulunamadı. Lütfen JAR dosyasını indirin.")
        sys.exit(1)

    print("JVM başlatılıyor...")
    jpype.startJVM(
        jpype.getDefaultJVMPath(),
        f"-Djava.class.path={ZEMBEREK_JAR}",
        "-ea"
    )

    # 3. Zemberek Morfoloji Nesnesini Kurma
    try:
        TurkishMorphology = jpype.JClass("zemberek.morphology.TurkishMorphology")
        morphology = TurkishMorphology.createWithDefaults()
        print("Zemberek Morfoloji servisi hazır.")
    except Exception as e:
        print(f"Zemberek başlatılamadı: {e}")
        sys.exit(1)

    # 4. Kelimeleri İndir ve İşle
    raw_words = download_file(RAW_WORDLIST_URL)
    
    # Uzunluklara göre gruplama sözlüğü
    word_buckets = {i: set() for i in range(MIN_LEN, MAX_LEN + 1)}
    
    print(f"Toplam {len(raw_words)} ham kelime işleniyor...")
    
    count = 0
    for word in raw_words:
        word = word.strip().lower()
        length = len(word)

        # Temel filtreler (uzunluk ve özel karakter)
        if not (MIN_LEN <= length <= MAX_LEN):
            continue
        if any(char in word for char in " .'0123456789-_/"):
            continue

        # Zemberek Analizi (En kritik kısım)
        # Kelimenin geçerli bir Türkçe kelime olup olmadığını kontrol eder
        results = morphology.analyze(word)
        
        # Eğer analiz sonucu varsa ve "Bilinmeyen" değilse
        if results.getAnalysisResults() and not results.getAnalysisResults()[0].getItem().isUnknown():
            word_buckets[length].add(word)
        
        count += 1
        if count % 10000 == 0:
            print(f"{count} kelime tarandı...")

    # 5. Dosyaları Kaydet
    print("Dosyalar kaydediliyor...")
    for length, words in word_buckets.items():
        filename = os.path.join(DATA_DIR, f"words{length}.json")
        sorted_list = sorted(list(words), key=lambda x: (len(x), x)) # Alfabetik sırala
        
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(sorted_list, f, ensure_ascii=False, indent=2)
        
        print(f"-> {filename} oluşturuldu. ({len(sorted_list)} kelime)")

    # JVM Kapat
    jpype.shutdownJVM()
    print("İşlem tamamlandı.")

if __name__ == "__main__":
    main()
