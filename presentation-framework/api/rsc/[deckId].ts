import path from 'node:path';
import { promises as fs } from 'node:fs';
import JSZip from 'jszip';
import type { NextApiRequest, NextApiResponse } from 'next';

export const config = {
  runtime: 'nodejs',
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { deckId } = req.query;
  if (typeof deckId !== 'string') {
    res.status(400).json({ error: 'deckId must be a string' });
    return;
  }

  try {
    const filePath = path.join(process.cwd(), 'dist', `${deckId}.lume`);
    const data = await fs.readFile(filePath);
    const zip = await JSZip.loadAsync(data);
    const rscFile = zip.file('lume.rsc');

    if (!rscFile) {
      res.status(404).json({ error: 'lume.rsc not found in archive' });
      return;
    }

    const buffer = await rscFile.async('nodebuffer');
    res.setHeader('Content-Type', 'text/x-component');
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(buffer);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
}
