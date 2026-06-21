import urllib.request
import tarfile
import os

url = 'https://github.com/k2-fsa/sherpa-onnx/releases/download/v1.10.15/sherpa-onnx-wasm-main.js'
wasm_url = 'https://github.com/k2-fsa/sherpa-onnx/releases/download/v1.10.15/sherpa-onnx-wasm-main.wasm'
dest_dir = 'src/assets/sherpa'
os.makedirs(dest_dir, exist_ok=True)

urllib.request.urlretrieve(url, os.path.join(dest_dir, 'sherpa-onnx-wasm-main.js'))
urllib.request.urlretrieve(wasm_url, os.path.join(dest_dir, 'sherpa-onnx-wasm-main.wasm'))
print("Downloaded sherpa-onnx-wasm.")
