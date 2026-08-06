type ImageUploadProps = {
  fileName: string;
  previewUrl: string;
  onChange: (fileName: string, previewUrl: string) => void;
};

export function ImageUpload({ fileName, onChange, previewUrl }: ImageUploadProps) {
  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      onChange(file.name, String(reader.result || ""));
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="image-enhance-upload">
      <label>
        商品图片
        <input accept="image/*" required type="file" onChange={handleFileChange} />
      </label>
      <div className="image-enhance-preview">
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt={fileName || "商品图片预览"} src={previewUrl} />
        ) : (
          <p>选择图片后显示预览</p>
        )}
      </div>
      {fileName ? <span>{fileName}</span> : null}
    </div>
  );
}
