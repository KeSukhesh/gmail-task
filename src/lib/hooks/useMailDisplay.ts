import { useState, useEffect } from "react";
import type { Mail } from "~/app/_components/dashboard/mail/types";

interface UseMailDisplayProps {
  mail: Mail | null;
}

interface UseMailDisplayReturn {
  htmlContent: string | null;
  isLoadingHtml: boolean;
  replyContent: string;
  setReplyContent: (content: string) => void;
  formatFileSize: (bytes: number) => string;
  getInitials: (name: string) => string;
}

export function useMailDisplay({ mail }: UseMailDisplayProps): UseMailDisplayReturn {
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [isLoadingHtml, setIsLoadingHtml] = useState(false);
  const [replyContent, setReplyContent] = useState("");

  // fetches and processes the html of newly selected mail
  useEffect(() => {
    if (mail?.htmlUrl) {
      setIsLoadingHtml(true);
      fetch(mail.htmlUrl)
        .then((response) => response.text())
        .then((html) => {
          // TODO: fix the image related code
          const processHtmlContent = (html: string): string => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            const images = doc.getElementsByTagName('img');
            for (const img of Array.from(images)) {
              const src = img.getAttribute('src');
              if (src) {
                if (src.startsWith('data:')) {
                  continue;
                }

                if (src.startsWith('/')) {
                  img.setAttribute('src', `https://mail.google.com${src}`);
                }

                if (src.startsWith('cid:')) {
                  const cid = src.replace('cid:', '');
                  const attachment = mail?.attachments.find(a => a.cid === cid);
                  if (attachment) {
                    img.setAttribute('src', attachment.url);
                  } else {
                    img.setAttribute('src', `data:image/png;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7`); // 1x1 transparent pixel as fallback
                  }
                }

                img.setAttribute('loading', 'lazy');
                img.setAttribute('onerror', 'this.onerror=null; this.src="data:image/png;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";');
              }
            }

            return doc.documentElement.outerHTML;
          };

          const processedHtml = processHtmlContent(html);
          setHtmlContent(processedHtml);
        })
        .catch((error) => {
          console.error("Error fetching HTML:", error);
          setHtmlContent(null);
        })
        .finally(() => setIsLoadingHtml(false));
    } else {
      setHtmlContent(null);
    }
  }, [mail?.htmlUrl, mail?.attachments]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getInitials = (name: string): string => {
    const cleanName = name.replace(/["']/g, '').trim();
    const words = cleanName.split(/\s+/).filter(Boolean);
    return words.slice(0, 2).map(word => word[0]).join('');
  };

  return {
    htmlContent,
    isLoadingHtml,
    replyContent,
    setReplyContent,
    formatFileSize,
    getInitials,
  };
}