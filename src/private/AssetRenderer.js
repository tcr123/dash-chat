import { FileText, X, Download } from "lucide-react";
import { useState } from "react";

function base64ToBlobUrl(base64, mimeType = "application/pdf") {
    const byteCharacters = atob(base64.split(",")[1]); // remove "data:..base64,"
    const byteNumbers = Array.from(byteCharacters, char => char.charCodeAt(0));
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    return URL.createObjectURL(blob);
}

// Helper to handle downloads for both base64 and URLs
const downloadFile = async (fileUrl, fileName) => {
    console.log("[AssetRenderer] Attempting download:", { fileUrl, fileName });

    // 1. Handle Base64 Data URLs
    if (fileUrl.startsWith("data:")) {
        console.log("[AssetRenderer] Detected Base64 Data URL, triggering anchor click.");
        const link = document.createElement("a");
        link.href = fileUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
    }

    // 2. Handle Google Cloud Storage Fallback URLs (Authenticated Browser URL)
    // These URLs do not support CORS fetch from third-party domains and require browser session cookies.
    // Fetching them will fail, and subsequent async window.open will be blocked by popup blockers.
    // SOLUTION: Detect them early and open synchronously (relative to the click event).
    if (fileUrl.includes("storage.cloud.google.com")) {
        console.log("[AssetRenderer] Detected GCS Authenticated URL, opening directly in new tab to avoid CORS/Popup issues.");
        window.open(fileUrl, "_blank");
        return;
    }

    // 3. Handle HTTP/HTTPS URLs (e.g., proper GCS Signed URLs with CORS)
    try {
        console.log("[AssetRenderer] Attempting fetch for blob download...");
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error("Network response was not ok: " + response.statusText);

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        console.log("[AssetRenderer] Fetch success, triggering blob download.");

        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up
        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
    } catch (error) {
        console.warn("[AssetRenderer] Direct download failed (likely CORS), falling back to new tab:", error);
        // Fallback: Open in new tab
        // Note: This might still be blocked by popup blockers if the async fetch took too long.
        window.open(fileUrl, "_blank");
    }
};

const AssetRenderer = ({ item }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Normalize input source: handle file, fileUrl, or fileData
    const fileSource = item.file || item.fileUrl || item.fileData;

    // Safety check
    if (!fileSource) {
        return (
            <div style={{ color: "red", fontSize: "12px", margin: "10px 0" }}>
                Error: Missing file source for {item.fileName}
            </div>
        );
    }

    const isImage = item.fileName.match(/\.(jpeg|jpg|png|gif)$/i);
    const isDocument = item.fileName.match(/\.(pdf|docx|doc|xlsx|xls|csv|txt)$/i);

    const handleDownload = () => {
        downloadFile(fileSource, item.fileName);
    };

    if (!isImage && isDocument) {
        let fileUrl = fileSource;

        // If PDF is base64 → convert to blob URL
        if (item.fileName.match(/\.pdf$/i) && fileSource.startsWith("data:application/pdf;base64,")) {
            fileUrl = base64ToBlobUrl(fileSource);
        }

        const extension = item.fileName.split(".").pop().toLowerCase();

        return (
            <DocumentPreviewCard
                fileUrl={fileUrl}
                fileName={item.fileName}
                description={item.description}
                extension={extension}
            />
        );
    }

    if (!isImage && !isDocument) {
        return (
            <DocumentPreviewCard
                fileUrl={fileSource}
                fileName={item.fileName}
                description={item.description || "Unsupported file generated."}
                extension={"file"} // Treat as generic file
            />
        );
    }

    return (
        <div style={{ margin: "10px 0" }}>

            {/* Description ABOVE image (normal text in chat bubble) */}
            {item.description && (
                <div
                    style={{
                        marginBottom: "8px",
                        fontSize: "15px",
                        color: "#444",
                        fontWeight: 500,
                        lineHeight: "1.4",
                    }}
                >
                    {item.description}
                </div>
            )}

            {/* Base image */}
            <img
                src={fileSource}
                alt={item.fileName}
                style={{
                    // Responsive Styles
                    width: "100%",
                    maxWidth: item.width || "500px",
                    height: item.height || "auto",
                    borderRadius: "5px",
                    cursor: "pointer",
                    objectFit: "contain",        // Preserve aspect ratio
                    ...item.style,
                }}
                onClick={() => setIsModalOpen(true)}
            />

            {/* MODAL */}
            {isModalOpen && (
                <div
                    onClick={() => setIsModalOpen(false)}
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        width: "100vw",
                        height: "100vh",
                        backgroundColor: "rgba(0,0,0,0.75)",
                        backdropFilter: "blur(8px)",
                        WebkitBackdropFilter: "blur(8px)",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        zIndex: 999999,
                    }}
                >
                    <div
                        style={{
                            position: "relative",
                            maxWidth: "90vw",
                            maxHeight: "90vh",
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img
                            src={fileSource}
                            alt={item.fileName}
                            style={{
                                width: "100%",
                                height: "auto",
                                maxHeight: "90vh",
                                borderRadius: "5px",
                                display: "block",
                                objectFit: "contain"
                            }}
                        />

                        {/* Buttons */}
                        <div
                            style={{
                                position: "absolute",
                                top: 10,
                                right: 10,
                                display: "flex",
                                gap: "10px",
                            }}
                        >
                            <button
                                onClick={handleDownload}
                                style={{
                                    background: "rgba(0,0,0,0.5)",
                                    border: "none",
                                    borderRadius: "50%",
                                    padding: "5px",
                                    color: "#fff",
                                    cursor: "pointer",
                                }}
                            >
                                <Download size={18} />
                            </button>

                            <button
                                onClick={() => setIsModalOpen(false)}
                                style={{
                                    background: "rgba(0,0,0,0.5)",
                                    border: "none",
                                    borderRadius: "50%",
                                    padding: "5px",
                                    color: "#fff",
                                    cursor: "pointer",
                                }}
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const DocumentPreviewCard = ({ fileUrl, fileName, description, extension }) => {
    // Determine the type based on the passed extension prop
    const fileExtension = extension || fileName.split(".").pop().toLowerCase();
    const isPDF = fileExtension === "pdf";
    const isDOCX = fileExtension === "docx" || fileExtension === "doc";
    const isSpreadsheet = fileExtension === "xlsx" || fileExtension === "xls";
    const isText = fileExtension === "txt" || fileExtension === "csv";

    // --- MODIFICATION: REMOVE Google Viewer URL WRAPPING ---
    // We will use the fileUrl directly for downloading/window.open.
    // Base64/Blob URLs are handled by the browser for direct viewing/downloading.
    const previewUrl = fileUrl; // Use fileUrl directly

    const getFileLabel = () => {
        if (isPDF) return "PDF Document";
        if (isDOCX) return "Word Document";
        if (isSpreadsheet) return "Spreadsheet File";
        if (isText) return "Text File";
        return "Generated File";
    };

    const handleDownloadClick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        downloadFile(fileUrl, fileName);
    }

    return (
        <div style={{ marginTop: "12px" }}>

            {/* ⭐ Description / Title */}
            {description && (
                <div
                    style={{
                        marginBottom: "8px",
                        fontSize: "15px",
                        color: "#444",
                        fontWeight: 500,
                        lineHeight: "1.4",
                    }}
                >
                    {description}
                </div>
            )}

            {/* ⭐ Unified Preview Card */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    background: "#f5f5f7",
                    borderRadius: "12px",
                    padding: "14px 16px",
                    marginTop: "10px",
                    marginBottom: "10px",
                    border: "1px solid #e3e3e3",
                    cursor: "pointer",
                    transition: "0.2s",
                }}
                // MODIFICATION: Use window.open with the raw file URL (Base64/Blob) 
                // The browser will decide whether to download it or show a preview (like PDF)
                onClick={() => window.open(previewUrl, "_blank")}
                onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#ebebef")
                }
                onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "#f5f5f7")
                }
            >
                {/* Icon changes based on file type */}
                <FileText size={22} color="#4a4a4a" />
                {/* Simplified icon: FileText for documents, File for others */}

                <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                        style={{
                            fontSize: "15px",
                            fontWeight: 500,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                        }}
                        title={fileName} // Show full name on hover
                    >
                        {fileName}
                    </div>
                    <div style={{ fontSize: "12px", color: "#666" }}>
                        {getFileLabel()} {/* Use the new label function */}
                    </div>
                </div>

                {/* Download Button */}
                <a
                    href={fileUrl}
                    download={fileName}
                    onClick={handleDownloadClick}
                    style={{
                        padding: "6px 10px",
                        borderRadius: "8px",
                        background: "#007bff",
                        color: "#fff",
                        fontSize: "12px",
                        textDecoration: "none",
                        display: "flex",
                        alignItems: "center"
                    }}
                >
                    <Download size={14} />
                </a>
            </div>
        </div>
    );
};

export default AssetRenderer;
