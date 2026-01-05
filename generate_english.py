import os
import json
import requests
import sys
# NLTK kütüphanesini import ediyoruz (Zemberek yerine)
import nltk
from nltk.corpus import words

# --- AYARLAR ---
DATA_DIR = "data_en"  # İngilizce veriler buraya
MIN_LEN = 3
MAX_LEN = 9

# GitHub'daki en temiz "sadece harf" içeren İngilizce listesi
RAW_WORDLIST_URL = "https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt"
# ----------------

def setup_nltk():
    """NLTK veri paketlerini indirir"""
    print("DEBUG: NLTK sözlüğü indiriliyor...")
    try:
        nltk.download('words', quiet=True)
        print("DEBUG: NLTK hazır.")
    except Exception as e:
        print(f"NLTK hatası: {e}")
        sys.exit(1)

def download_file(url):
    print(f"DEBUG: Bağlanılıyor -> {url}")
    try:
        response = requests.get(url, timeout=30)
        if response.status_code == 200:
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
    # 1. Klasör ve Kütüphane Hazırlığı
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)
    
    setup_nltk()
    
    # Doğrulama kümesi (Set araması çok hızlıdır)
    # NLTK'nin resmi sözlüğünü referans alıyoruz
    english_vocab = set(words.words())
    print(f"DEBUG: Referans sözlük boyutu: {len(english_vocab)} kelime")

    # 2. Kelimeleri İndir
    raw_words = download_file(RAW_WORDLIST_URL)
    word_buckets = {i: set() for i in range(MIN_LEN, MAX_LEN + 1)}
    
    count = 0
    valid_count = 0
    
    print("Analiz Başlıyor...")

    for word in raw_words:
        word = word.strip().lower()
        length = len(word)

        # Uzunluk Filtresi
        if not (MIN_LEN <= length <= MAX_LEN):
            continue
        
        # Sadece harf içerdiğinden emin ol (words_alpha.txt zaten temiz ama garanti olsun)
        if not word.isalpha():
            continue

        # DOĞRULAMA ADIMI:
        # Kelime NLTK'nin resmi sözlüğünde var mı?
        # (Bu adım çok katı gelirse kaldırabiliriz, ama oyun için gereklidir)
        if word in english_vocab:
            word_buckets[length].add(word)
            valid_count += 1
        
        count += 1
        if count % 50000 == 0:
            print(f"Taranan: {count} | Geçerli: {valid_count}")

    # 3. Kayıt
    print("\n" + "="*30)
    print("SONUÇ RAPORU (İNGİLİZCE):")
    print(f"Toplam Taranan: {len(raw_words)}")
    print(f"KABUL EDİLEN: {valid_count}")
    print("="*30 + "\n")

    if valid_count > 0:
        print("Dosyalar kaydediliyor...")
        for length, w_list in word_buckets.items():
            filename = os.path.join(DATA_DIR, f"words{length}.json")
            sorted_list = sorted(list(w_list), key=lambda x: (len(x), x))
            
            with open(filename, "w", encoding="utf-8") as f:
                json.dump(sorted_list, f, ensure_ascii=False, indent=2)
            print(f"-> {filename} : {len(sorted_list)} kelime")

if __name__ == "__main__":
    main()
