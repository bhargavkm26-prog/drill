import os
import easyocr
import pymupdf  # Replaced the deprecated 'fitz' import
from PIL import Image
import numpy as np

class ProductionDocumentIntelligence:
    """
    Enterprise-grade Multimodal OCR Engine using PyTorch-based EasyOCR.
    Bypasses brittle APIs and OS-level binary dependencies.
    """
    def __init__(self):
        print("[*] Initializing Deep Learning OCR Engine (EasyOCR)...")
        self.reader = easyocr.Reader(['en'])
        print("[+] Neural OCR Engine loaded and ready.")

    def extract_text_from_document(self, file_path: str) -> str:
        extracted_text_blocks = []
        
        try:
            images_to_process = []
            
            # 1. Handle Multi-Page PDFs natively
            if file_path.lower().endswith('.pdf'):
                print(f"[*] Rendering PDF pages to memory: {file_path}")
                doc = pymupdf.open(file_path)
                for page_num in range(len(doc)):
                    page = doc.load_page(page_num)
                    pix = page.get_pixmap(dpi=150)
                    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                    images_to_process.append(np.array(img))
            
            # 2. Handle Raw Scanned Images
            elif file_path.lower().endswith(('.png', '.jpg', '.jpeg', '.tiff', '.bmp')):
                img = Image.open(file_path).convert("RGB")
                images_to_process.append(np.array(img))
            
            if not images_to_process:
                print(f"[-] Unsupported file format or empty document: {file_path}")
                return ""

            print(f"[*] Running Neural OCR on {len(images_to_process)} page(s)...")
            
            # 3. Process each page
            for page_idx, img_array in enumerate(images_to_process):
                page_results = self.reader.readtext(img_array, detail=0, paragraph=True)
                joined_page = "\n".join(page_results)
                extracted_text_blocks.append(f"--- Page {page_idx + 1} ---\n{joined_page}")
                
            return "\n\n".join(extracted_text_blocks)
            
        except Exception as e:
            print(f"[-] Enterprise Extraction Failed on {file_path}: {e}")
            return ""