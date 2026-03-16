# 檔案位置：build_dict.py
import urllib.request
import zipfile
import io
import json

def build_stroke_json():
    print("🚀 正在連線至 Unicode 官方...")
    url = "https://hackage-content.haskell.org/package/cjk-0.1.0.0/src/data/Unihan/Unihan_DictionaryLikeData.txt"
    
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req) as response:
            lines = response.read().decode('utf-8').split('\n')
            stroke_dict = {}
            
            for line in lines:
                if not line or line.startswith('#'): continue
                if 'kTotalStrokes' in line:
                    parts = line.split('\t')
                    if len(parts) >= 3:
                        unicode_hex = parts[0].replace('U+', '')
                        stroke_count_str = parts[2].split(' ')[0]
                        try:
                            stroke_count = int(stroke_count_str)
                            char = chr(int(unicode_hex, 16))
                            # 建立 字符 -> 筆畫數 的對映 (例如: "王": 4)
                            stroke_dict[char] = stroke_count
                        except ValueError:
                            continue
            
            # 將字典匯出為標準 JSON 格式
            with open("stroke_dict.json", "w", encoding="utf-8") as f:
                json.dump(stroke_dict, f, ensure_ascii=False, separators=(',', ':'))
                
            print(f"✅ 大功告成！已生成 stroke_dict.json，共包含 {len(stroke_dict)} 個字。")
            print("👉 下一步：請將這個 stroke_dict.json 檔案上傳到您的 Supabase Storage！")
            
    except Exception as e:
        print(f"❌ 發生錯誤: {e}")

if __name__ == "__main__":
    build_stroke_json()