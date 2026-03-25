#!/usr/bin/env python3
"""
Terminal to Intel (TI2) - Autonomous Moltbot Spawner Fine-Tuning
This script is designed for purely local execution (e.g., RTX 3090/4090) 
to fine-tune Gemma using Unsloth, completely separated from cloud infrastructure.

Prerequisites:
pip install "unsloth[cu121-torch230] @ git+https://github.com/unslothai/unsloth.git"
pip install trl peft accelerate bitsandbytes datasets
"""

import os
from unsloth import FastLanguageModel
from unsloth import is_bfloat16_supported
from trl import SFTTrainer
from transformers import TrainingArguments
from datasets import Dataset

def main():
    max_seq_length = 4096
    dtype = None # Auto detection for Float16/Bfloat16
    load_in_4bit = True # 4bit Quantization to fit in 16GB VRAM (T4) or local RTX cards

    print("Loading Base Weights for FastLanguageModel locally...")
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name = "google/gemma-2-9b-it", # Google's native instruction model
        max_seq_length = max_seq_length,
        dtype = dtype,
        load_in_4bit = load_in_4bit,
    )

    # Apply PEFT/LoRA optimizations for extreme training speeds
    print("Applying PEFT/LoRA optimizations...")
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

    # Hardcoded dataset for Kimi K2.5 / Letta Subagent Orchestration Architecture (Moltbot Spawning)
    print("Injecting Custom Swarm & Moltbot Tools Examples...")
    style_dataset_entries = [
        {"text": "<|im_start|>user\nAdd a task to check the MFish predictor node.<|im_end|>\n<|im_start|>assistant\n<function_call>{\"name\": \"manage_todos\", \"arguments\": {\"action\": \"add\", \"task_text\": \"Check MFish Predictor\"}}</function_call><|im_end|>"},
        {"text": "<|im_start|>user\nComplete task ID 2.<|im_end|>\n<|im_start|>assistant\n<function_call>{\"name\": \"manage_todos\", \"arguments\": {\"action\": \"complete\", \"task_id\": 2}}</function_call><|im_end|>"},
        {"text": "<|im_start|>user\nAsk CONDUCTOR about the RAG implementation.<|im_end|>\n<|im_start|>assistant\n<function_call>{\"name\": \"delegate_to_swarm\", \"arguments\": {\"target_agent\": \"CONDUCTOR_RAG\", \"task_query\": \"Explain RAG implementation details\"}}</function_call><|im_end|>"},
        {"text": "<|im_start|>user\nTake a screenshot of the local desktop.<|im_end|>\n<|im_start|>assistant\n<function_call>{\"name\": \"use_computer\", \"arguments\": {\"action\": \"screenshot\"}}</function_call><|im_end|>"},
        {"text": "<|im_start|>user\nPredict market trends using the Swarm.<|im_end|>\n<|im_start|>assistant\n<function_call>{\"name\": \"delegate_to_swarm\", \"arguments\": {\"target_agent\": \"MFish_Predictor\", \"task_query\": \"Predict current market trends using vortex math\"}}</function_call><|im_end|>"},
        {"text": "<|im_start|>user\nAnalyze the C++ memory pool for bottlenecks. This requires deep hardware-level tracing.<|im_end|>\n<|im_start|>assistant\n<function_call>{\"name\": \"spawn_moltbot_monk\", \"arguments\": {\"specialty\": \"C++ Analysis\", \"container_name\": \"monk_cpp_validator_01\", \"task\": \"Analyze C++ memory pool bottlenecks via 8-Infinity sync\"}}</function_call><|im_end|>"},
        {"text": "<|im_start|>user\nThe system is reporting high thermal load on drive cluster 3. Investigate the hardware interface.<|im_end|>\n<|im_start|>assistant\n<function_call>{\"name\": \"spawn_moltbot_monk\", \"arguments\": {\"specialty\": \"Hardware Monitor\", \"container_name\": \"monk_thermal_sentry\", \"task\": \"Monitor drive 3 thermals and issue cool-down directives\"}}</function_call><|im_end|>"},
        {"text": "<|im_start|>user\nIndex the 50 SATA drive array and cross-reference with our Letta agent orchestration log.<|im_end|>\n<|im_start|>assistant\n<function_call>{\"name\": \"spawn_moltbot_monk\", \"arguments\": {\"specialty\": \"Data Indexer\", \"container_name\": \"monk_letta_indexer\", \"task\": \"Index SATA array and parse Letta orchestration logs\"}}</function_call><|im_end|>"}
    ]

    custom_dataset = Dataset.from_list(style_dataset_entries)
    print(f"✅ Compiled {len(style_dataset_entries)} schemas to train custom Moltbot operations.")

    # SFTTrainer Setup
    print("Initializing SFTTrainer...")
    trainer = SFTTrainer(
        model = model,
        tokenizer = tokenizer,
        train_dataset = custom_dataset,
        dataset_text_field = "text",
        max_seq_length = max_seq_length,
        dataset_num_proc = 2,
        packing = False, # Can make training 5x faster for short sequences.
        args = TrainingArguments(
            per_device_train_batch_size = 2,
            gradient_accumulation_steps = 4,
            warmup_steps = 5,
            max_steps = 60, # Increase for broader fine-tuning
            learning_rate = 2e-4,
            fp16 = not is_bfloat16_supported(),
            bf16 = is_bfloat16_supported(),
            logging_steps = 1,
            optim = "adamw_8bit",
            weight_decay = 0.01,
            lr_scheduler_type = "linear",
            seed = 3407,
            output_dir = "outputs",
        ),
    )

    print("Starting Model Training...")
    trainer_stats = trainer.train()

    print("\nTraining Complete! Exporting to GGUF format for Ollama/Node.js usage...")
    # Exporting natively for Letta / Local LLM inference integration
    OUTPUT_NAME = "gemma-2-9b-it-ti2-moltbot"
    
    # Save the adapter
    model.save_pretrained_merged(OUTPUT_NAME, tokenizer, save_method = "lora")
    
    # Export to native 4-bit GGUF (Optimized for CPU & consumer GPU)
    try:
        model.save_pretrained_gguf(OUTPUT_NAME, tokenizer, quantization_method = "q4_k_m")
        print(f"Successfully exported local GGUF to ./{OUTPUT_NAME}/")
    except Exception as e:
        print(f"Failed to export GGUF directly, please manually merge: {e}")

if __name__ == "__main__":
    main()
