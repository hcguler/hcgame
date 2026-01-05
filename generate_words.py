import os
import json
import jpype
import requests
import sys

# --- AYARLAR ---
DATA_DIR = "data"
MIN_LEN = 3
MAX_LEN = 9
# Zemberek JAR yolu
ZEMBEREK_JAR = "libs/zemberek-full.jar" 

# Mert Emin Listesi (RAW)
RAW_WORDLIST_URL = "https://raw.githubusercontent.com/mertemin/turkish-word-list/master/words.txt"
# ----------------

def download_file(url):
    print(f"DEBUG: Bağlanılıyor -> {url}")
    try:
        response = requests.get(url, timeout=30)
        if response.status_code == 200:
            # ÖNEMLİ: Türkçe karakter sorunu için encoding'i zorluyoruz
            response.encoding = 'utf-8'
            lines = response.text.splitlines()
            print(f"DEBUG: İndirme Başarılı. Toplam Satır: {len(lines)}")
            if len(lines) > 0:
                print(f"DEBUG: İlk 3 kelime örneği: {lines[:3]}")
            return lines
        else:
            print(f"HATA: Sunucu {response.status_code} kodu döndü.")
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
    if not os.path.exists(jar_path):
        print(f"HATA: JAR bulunamadı -> {jar_path}")
        sys.exit(1)
    
    print(f"DEBUG: JAR Yolu: {jar_path}")
    print(f"DEBUG: JAR Boyutu: {os.path.getsize(jar_path) / (1024*1024):.2f} MB")

    print("JVM başlatılıyor...")
    try:
        if not jpype.isJVMStarted():
            jpype.startJVM(
                jpype.getDefaultJVMPath(),
                f"-Djava.class.path={jar_path}",
                "-ea"
            )
    except Exception as e:
        print(f"JVM Hatası: {e}")
        sys.exit(1)

    # 3. Zemberek Yükleme
    try:
        TurkishMorphology = jpype.JClass("zemberek.morphology.TurkishMorphology")
        morphology = TurkishMorphology.createWithDefaults()
        print("DEBUG: Zemberek motoru yüklendi.")
    except Exception as e:
        print(f"Zemberek Sınıf Hatası: {e}")
        sys.exit(1)

    # --- TEST ADIMI: MOTOR ÇALIŞIYOR MU? ---
    print("-" * 20)
    print("DEBUG: Motor Testi Yapılıyor ('elma')...")
    test_results = morphology.analyze("elma")
    if test_results and test_results.getAnalysisResults():
        print("DEBUG: Motor 'elma'yı tanıdı! Sonuç:", test_results.getAnalysisResults()[0])
    else:
        print("HATA: Motor 'elma' kelimesini bile tanıyamadı! JAR dosyası bozuk olabilir.")
    print("-" * 20)
    # ---------------------------------------

    # 4. Kelimeleri İndir ve İşle
    raw_words = download_file(RAW_WORDLIST_URL)
    word_buckets = {i: set() for i in range(MIN_LEN, MAX_LEN + 1)}
    
    count = 0
    valid_count = 0
    rejected_unknown = 0
    rejected_chars = 0
    rejected_len = 0
    
    print("Analiz Başlıyor...")

    for word in raw_words:
        original_word = word
        word = word.strip().lower()
        length = len(word)

        if not (MIN_LEN <= length <= MAX_LEN):
            rejected_len += 1
            continue
        
        if any(char in word for char in " .'0123456789-_/"):
            rejected_chars += 1
            continue

        try:
            results = morphology.analyze(word)
            
            # Analiz sonucu var mı?
            if results and results.getAnalysisResults():
                item = results.getAnalysisResults()[0].getItem()
                
                if not item.isUnknown():
                    word_buckets[length].add(word)
                    valid_count += 1
                else:
                    # Bilinmeyen kelime olarak işaretlendi
                    rejected_unknown += 1
                    # Debug için ilk 5 bilinmeyeni yazdıralım
                    if rejected_unknown < 5:
                        print(f"DEBUG: Bilinmeyen Kelime -> {word}")
            else:
                rejected_unknown += 1
                
        except Exception as e:
            print(f"Analiz Hatası ({word}): {e}")
            continue
        
        count += 1
        if count % 10000 == 0:
            print(f"İşlenen: {count} | Geçerli: {valid_count} | Bilinmeyen: {rejected_unknown}")

    # 5. İstatistik ve Kayıt
    print("\n" + "="*30)
    print("SONUÇ RAPORU:")
    print(f"Toplam Taranan: {len(raw_words)}")
    print(f"Uzunluk Uymayan: {rejected_len}")
    print(f"Yasaklı Karakter: {rejected_chars}")
    print(f"Zemberek 'Bilinmeyen' Dedi: {rejected_unknown}")
    print(f"KABUL EDİLEN (Dosyaya Yazılacak): {valid_count}")
    print("="*30 + "\n")

    if valid_count == 0:
        print("UYARI: Hiçbir kelime geçerli bulunamadı! Lütfen yukarıdaki 'Bilinmeyen Kelime' örneklerine bakarak sorunu anlayın.")
    else:
        print("Dosyalar kaydediliyor...")
        for length, words in word_buckets.items():
            filename = os.path.join(DATA_DIR, f"words{length}.json")
            sorted_list = sorted(list(words), key=lambda x: (len(x), x))
            
            with open(filename, "w", encoding="utf-8") as f:
                json.dump(sorted_list, f, ensure_ascii=False, indent=2)
            print(f"-> {filename} : {len(sorted_list)} kelime")

    if jpype.isJVMStarted():
        jpype.shutdownJVM()

if __name__ == "__main__":
    main()
