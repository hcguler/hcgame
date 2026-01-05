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
            response.encoding = 'utf-8'
            lines = response.text.splitlines()
            print(f"DEBUG: İndirme Başarılı. Toplam Satır: {len(lines)}")
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

    # 4. Kelimeleri İndir ve İşle
    raw_words = download_file(RAW_WORDLIST_URL)
    word_buckets = {i: set() for i in range(MIN_LEN, MAX_LEN + 1)}
    
    count = 0
    valid_count = 0
    
    print("Analiz Başlıyor...")

    for word in raw_words:
        word = word.strip().lower()
        length = len(word)

        if not (MIN_LEN <= length <= MAX_LEN):
            continue
        
        if any(char in word for char in " .'0123456789-_/"):
            continue

        try:
            results = morphology.analyze(word)
            
            if results and results.getAnalysisResults():
                # DÜZELTME BURADA: .getItem() yerine .getDictionaryItem() kullanıyoruz
                best_analysis = results.getAnalysisResults()[0]
                
                # Zemberek 0.17.1 uyumluluğu
                item = best_analysis.getDictionaryItem()
                
                if not item.isUnknown():
                    word_buckets[length].add(word)
                    valid_count += 1
            
        except AttributeError:
            # Eğer getDictionaryItem da çalışmazsa metodları görelim (sadece ilk hatada)
            if count == 0:
                print(f"HATA: Metod bulunamadı. Mevcut metodlar: {dir(results.getAnalysisResults()[0])}")
            continue
        except Exception as e:
            continue
        
        count += 1
        if count % 10000 == 0:
            print(f"İşlenen: {count} | Geçerli: {valid_count}")

    # 5. İstatistik ve Kayıt
    print("\n" + "="*30)
    print("SONUÇ RAPORU:")
    print(f"Toplam Taranan: {len(raw_words)}")
    print(f"KABUL EDİLEN: {valid_count}")
    print("="*30 + "\n")

    if valid_count > 0:
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
