import os
import chromadb
from chromadb.utils import embedding_functions
import glob

# CONFIG
DB_PATH = r"E:\T2I-bot-skill\neural_memory"
COLLECTION_NAME = "t2i_rig_brain"
CHUNKS_DIR = [
    r"E:\T2I-bot-skill\src",
    r"E:\T2I-bot-skill\scripts",
    r"E:\T2I-bot-skill\sdk",
    r"C:\Users\natra\.gemini\antigravity\brain"
]

def index_rig():
    print(f"--- T2I Neural Indexer: V7.0 ---")
    client = chromadb.PersistentClient(path=DB_PATH)
    default_ef = embedding_functions.DefaultEmbeddingFunction()
    collection = client.get_or_create_collection(name=COLLECTION_NAME, embedding_function=default_ef)

    total_files = 0
    for path in CHUNKS_DIR:
        if not os.path.exists(path):
            print(f"[WARN] Path not found: {path}")
            continue
        
        print(f"[INDEX] Crawling: {path}")
        # Recursive glob for common source files
        files = glob.glob(os.path.join(path, "**", "*.*"), recursive=True)
        for file_path in files:
            if any(ext in file_path for ext in ['.tsx', '.ts', '.js', '.py', '.md', '.json', '.css']):
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                        if not content.strip(): continue
                        
                        # Use simple chunks for now (or split by lines)
                        file_id = os.path.relpath(file_path, "E:\\")
                        collection.upsert(
                            documents=[content],
                            metadatas=[{"source": file_path}],
                            ids=[file_id]
                        )
                        total_files += 1
                except Exception as e:
                    print(f"[ERR] Could not index {file_path}: {e}")

    print(f"--- Indexing Complete: {total_files} nodes synchronized. ---")

if __name__ == "__main__":
    index_rig()
