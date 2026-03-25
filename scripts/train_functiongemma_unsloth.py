#!/usr/bin/env python3
"""
Terminal to Intel (TI2) - FunctionGemma Autonomous Tool Tuning
This script is designed to be executed inside a T4 GPU Google Colab environment or 
locally on an RTX 3090/4090 using the extreme memory optimizations of Unsloth.

Dependencies:
!pip install "unsloth[colab-new] @ git+https://github.com/unslothai/unsloth.git"
!pip install --no-deps "xformers<0.0.27" "trl<0.9.0" peft accelerate bitsandbytes
"""

import os
from unsloth import FastLanguageModel
from trl import SFTTrainer
from transformers import TrainingArguments
from datasets import load_dataset
from google.colab import auth

def authenticate_google_cloud():
    print("Mounting Google Cloud / Vertex AI Datasets...")
    try:
        auth.authenticate_user()
        print("Successfully authenticated with Google Cloud Platform.")
        # Note: If your datasets are in GCS bucket: "wide-maxim-487506-u1-data"
        # !gsutil cp gs://wide-maxim-487506-u1-data/tool_logs.jsonl ./
    except Exception as e:
        print("Running locally without GCP integration.")


def main():
    # 1. Mount Data Architecture
    authenticate_google_cloud()

    max_seq_length = 4096 
    dtype = None # Auto detection for Float16/Bfloat16
    load_in_4bit = True # 4bit Quantization to fit in 16GB VRAM (T4)

    # 2. Load FunctionGemma via Unsloth base
    print("Loading Base Weights for FastLanguageModel...")
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name = "google/gemma-2-9b-it", # Google's native instruction model
        max_seq_length = max_seq_length,
        dtype = dtype,
        load_in_4bit = load_in_4bit,
    )

    # 3. Apply PEFT/LoRA optimizations for extreme training speeds
    model = FastLanguageModel.get_peft_model(
        model,
        r = 16, # Rank
        target_modules = ["q_proj", "k_proj", "v_proj", "o_proj",
                          "gate_proj", "up_proj", "down_proj",],
        lora_alpha = 16,
        lora_dropout = 0,
        bias = "none",
        use_gradient_checkpointing = "unsloth",
        random_state = 1337,
        use_rslora = False,
        loftq_config = None,
    )
    # 4. Clone User Repositories to build Personal Coding Style Dataset
    print("\n--- Compiling Personal Workflow Dataset ---")
    repos = [
        "https://github.com/Neutro916/nameless-memo",
        "https://github.com/Neutro916/nemo-ai-dien-kernel",
        "https://github.com/Neutro916/reality-forge-1",
        "https://github.com/Neutro916/Junk"
    ]
    
    style_dataset_entries = []
    
    for repo in repos:
        repo_name = repo.split("/")[-1]
        print(f"Cloning {repo_name}...")
        os.system(f"git clone {repo} ./repos/{repo_name} --quiet")
        
        # Traverse repo to build SFTTrainer dataset pairs
        for root, dirs, files in os.walk(f"./repos/{repo_name}"):
            for file in files:
                if file.endswith((".py", ".ts", ".tsx", ".js", ".md", ".json")):
                    try:
                        filepath = os.path.join(root, file)
                        with open(filepath, "r", encoding="utf-8") as f:
                            content = f.read()
                            # We use <|im_start|> tags (ChatML) which Unsloth natively parses for Gemma models if configured!
                            if len(content) > 50:
                                style_dataset_entries.append({
                                    "text": f"<|im_start|>user\nReplicate my personal coding style for '{file}'.<|im_end|>\n<|im_start|>assistant\n```\n{content}\n```<|im_end|>"
                                })
                    except Exception:
                        pass
                        
    print(f"✅ Compiled {len(style_dataset_entries)} files to learn your coding style!")

    from datasets import Dataset
    custom_dataset = Dataset.from_list(style_dataset_entries)

    print("\n--- Model structure created. Ready for SFTTrainer Integration ---\n")
    # You can now pass `train_dataset = custom_dataset` to your Unsloth SFTTrainer!
    print("When training completes, export the GGUF layout back to Terminal to Intel using:")
    print("model.save_pretrained_gguf('functiongemma-ti-custom', tokenizer, quantization_method = 'q4_k_m')")

if __name__ == "__main__":
    main()
