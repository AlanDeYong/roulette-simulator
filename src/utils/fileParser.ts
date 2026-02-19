/**
 * Parses a large text file in chunks to avoid blocking the main thread.
 * 
 * @param file The file to parse
 * @param onProgress Callback with the total number of items parsed so far
 * @param onComplete Callback with the final array of parsed numbers
 * @param onError Callback if an error occurs
 * @param chunkSize Size of each chunk in bytes (default 5MB)
 */
export const parseFileInChunks = (
    file: File,
    onProgress: (count: number) => void,
    onComplete: (data: number[]) => void,
    onError: (error: any) => void,
    chunkSize: number = 5 * 1024 * 1024 // 5MB
) => {
    const fileSize = file.size;
    let offset = 0;
    let accumulatedData: number[] = [];
    let leftover = ''; // To handle numbers split across chunks

    const readNextChunk = () => {
        const reader = new FileReader();
        const blob = file.slice(offset, offset + chunkSize);

        reader.onload = (e) => {
            const text = e.target?.result as string;
            if (!text) {
                onComplete(accumulatedData);
                return;
            }

            // Prepend leftover from previous chunk
            const fullText = leftover + text;

            // Check if the last character is a digit or minus sign (part of a number)
            // If so, save the last partial number for the next chunk
            // Unless this is the very last chunk
            let processingText = fullText;
            leftover = '';

            if (offset + chunkSize < fileSize) {
                // Find the last non-number character to safely split
                // We want to slice up to the last complete number separator
                // A simple heuristic: look for the last whitespace or comma
                 const lastSeparatorIndex = Math.max(
                    fullText.lastIndexOf(' '),
                    fullText.lastIndexOf('\n'),
                    fullText.lastIndexOf(','),
                    fullText.lastIndexOf('\t')
                );

                if (lastSeparatorIndex !== -1 && lastSeparatorIndex > fullText.length - 20) {
                     // If we found a separator near the end, safe to split there
                     leftover = fullText.substring(lastSeparatorIndex + 1);
                     processingText = fullText.substring(0, lastSeparatorIndex + 1);
                } else {
                    // Fallback: If no separator found nearby, it might be a huge block of numbers or just one number? 
                    // Or we just cut in the middle of a number.
                    // Let's just find the last regex match and see if it's cut off?
                    // Simpler: Just preserve the last few chars if they look like a number
                     const match = fullText.match(/(-?\d+)$/);
                     if (match) {
                         leftover = match[0];
                         processingText = fullText.substring(0, fullText.length - leftover.length);
                     }
                }
            }

            // Parse numbers in the current chunk
            const matches = processingText.match(/-?\d+/g);
            if (matches) {
                const numbers = matches.map(Number).filter(n => !isNaN(n));
                accumulatedData.push(...numbers);
            }

            onProgress(accumulatedData.length);

            offset += chunkSize;

            if (offset < fileSize) {
                // Schedule next chunk read to yield back to main thread
                setTimeout(readNextChunk, 0); 
            } else {
                // Done
                // If there's any leftover (should basically be handled inside loop for last chunk, but just in case)
                 if (leftover) {
                    const matches = leftover.match(/-?\d+/g);
                    if (matches) {
                        const numbers = matches.map(Number).filter(n => !isNaN(n));
                        accumulatedData.push(...numbers);
                    }
                }
                onComplete(accumulatedData);
            }
        };

        reader.onerror = (err) => {
            onError(err);
        };

        reader.readAsText(blob);
    };

    readNextChunk();
};

