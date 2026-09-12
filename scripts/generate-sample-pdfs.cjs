const fs = require('fs');
const path = require('path');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');

const PDF_DIR = path.join(__dirname, '..', 'pdf');

if (!fs.existsSync(PDF_DIR)) {
  fs.mkdirSync(PDF_DIR, { recursive: true });
}

const sampleNotes = [
  {
    fileName: 'Data_Structures_and_Algorithms.pdf',
    title: 'Data Structures & Algorithms - Complete Notes',
    subject: 'Computer Science',
    tags: ['CS', 'Algorithms', 'InterviewPrep'],
    pages: [
      {
        heading: '1. Big-O Complexity & Fundamental Data Structures',
        subheading: 'Time and Space Complexity Cheatsheet',
        bullets: [
          'Arrays: O(1) random access, O(n) insertion/deletion at arbitrary indices.',
          'Linked Lists: O(1) prepend/append with tail pointer, O(n) search.',
          'Hash Tables: O(1) average lookup/insert/delete, O(n) worst case with collisions.',
          'Binary Search Trees: O(log n) balanced (AVL/Red-Black), O(n) skewed worst case.',
          'Heaps (Priority Queues): O(log n) insert/extract-min, O(1) peek.'
        ],
        quote: 'Key takeaway: Choose the right data structure for your access vs mutation patterns.'
      },
      {
        heading: '2. Graph Traversal & Dynamic Programming',
        subheading: 'Core Patterns for Solving Complex Problems',
        bullets: [
          'Breadth-First Search (BFS): Queue-based, shortest path in unweighted graphs.',
          'Depth-First Search (DFS): Stack/recursion-based, cycle detection, topological sort.',
          'Dijkstras Algorithm: Priority queue for shortest paths with non-negative weights.',
          'Memoization (Top-Down): Cache subproblem results using recursion.',
          'Tabulation (Bottom-Up): Iteratively fill DP table from base cases.'
        ],
        quote: 'Master overlapping subproblems and optimal substructure.'
      }
    ]
  },
  {
    fileName: 'Machine_Learning_Cheat_Sheet.pdf',
    title: 'Machine Learning & Deep Learning Notes',
    subject: 'Artificial Intelligence',
    tags: ['AI', 'MachineLearning', 'CheatSheet'],
    pages: [
      {
        heading: '1. Supervised vs Unsupervised Learning',
        subheading: 'Foundations of Modern ML Systems',
        bullets: [
          'Linear Regression: Predicting continuous targets via MSE loss optimization.',
          'Logistic Regression & Softmax: Probability calibration and classification.',
          'Decision Trees & Random Forests: Ensemble learning with bagging and feature subsampling.',
          'Gradient Boosting (XGBoost/LightGBM): Sequential error correction using weak learners.',
          'PCA & t-SNE: Dimensionality reduction for visualization and feature extraction.'
        ],
        quote: 'Always understand the bias-variance tradeoff when tuning regularization parameters.'
      },
      {
        heading: '2. Neural Networks & Transformer Architectures',
        subheading: 'Self-Attention Mechanism & Optimization',
        bullets: [
          'Backpropagation: Chain rule calculation of loss gradients with respect to weights.',
          'Activation Functions: ReLU, GeLU, Swish preventing vanishing gradients.',
          'Self-Attention: Scaled Dot-Product Attention = Softmax(QK^T / sqrt(d_k)) * V.',
          'Positional Encodings: Injecting sequence order into non-recurrent transformers.',
          'Optimizers: AdamW with weight decay, cosine annealing learning rate schedules.'
        ],
        quote: 'Attention Is All You Need — Vaswani et al.'
      }
    ]
  },
  {
    fileName: 'Quantum_Physics_Lecture_Notes.pdf',
    title: 'Quantum Mechanics & Modern Physics',
    subject: 'Physics',
    tags: ['Physics', 'Quantum', 'Lecture'],
    pages: [
      {
        heading: '1. Wave-Particle Duality & Schrödinger Equation',
        subheading: 'Fundamental Postulates of Quantum Mechanics',
        bullets: [
          'de Broglie Wavelength: lambda = h / p connecting momentum and wave characteristics.',
          'Time-dependent Schrödinger Equation: i * hbar * d(Psi)/dt = H * Psi.',
          'Heisenberg Uncertainty Principle: Delta x * Delta p >= hbar / 2.',
          'Wavefunction Interpretation: |Psi(x,t)|^2 represents probability density.',
          'Infinite Square Well: Quantized energy levels E_n = (n^2 * pi^2 * hbar^2) / (2 * m * L^2).'
        ],
        quote: 'Anyone who is not shocked by quantum theory has not understood it. — Niels Bohr'
      }
    ]
  },
  {
    fileName: 'Calculus_III_Vector_Analysis.pdf',
    title: 'Calculus III - Multivariable & Vector Calculus',
    subject: 'Mathematics',
    tags: ['Math', 'Calculus', 'University'],
    pages: [
      {
        heading: '1. Partial Derivatives & Gradient Vectors',
        subheading: 'Directional Derivatives & Optimization',
        bullets: [
          'Gradient Vector (grad f): Points in the direction of steepest ascent.',
          'Tangent Planes: Equation z - z0 = fx(x0, y0)(x - x0) + fy(x0, y0)(y - y0).',
          'Lagrange Multipliers: Optimization under constraint g(x,y,z) = k via grad f = lambda * grad g.',
          'Multiple Integrals: Fubinis theorem and switching between Cartesian and Polar coordinates.',
          'Vector Fields: Divergence (flux density) and Curl (rotational circulation).'
        ],
        quote: 'Green’s, Stokes’, and Divergence Theorems unify multivariable calculus into one framework.'
      }
    ]
  }
];

async function generateSamplePDFs() {
  const initialMetadata = {};

  for (const item of sampleNotes) {
    const filePath = path.join(PDF_DIR, item.fileName);
    if (!fs.existsSync(filePath)) {
      const pdfDoc = await PDFDocument.create();
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

      for (let i = 0; i < item.pages.length; i++) {
        const pageData = item.pages[i];
        const page = pdfDoc.addPage([595.28, 841.89]); // A4 size in points

        // Header Background Banner
        page.drawRectangle({
          x: 0,
          y: 750,
          width: 595.28,
          height: 91.89,
          color: rgb(0.08, 0.12, 0.22)
        });

        // Subject Badge
        page.drawRectangle({
          x: 40,
          y: 795,
          width: 140,
          height: 22,
          color: rgb(0.24, 0.42, 0.96)
        });
        page.drawText(item.subject.toUpperCase(), {
          x: 48,
          y: 802,
          size: 9,
          font: helveticaBold,
          color: rgb(1, 1, 1)
        });

        // Document Title
        page.drawText(item.title, {
          x: 40,
          y: 765,
          size: 16,
          font: helveticaBold,
          color: rgb(1, 1, 1)
        });

        // Page Number
        page.drawText(`Page ${i + 1} of ${item.pages.length}`, {
          x: 500,
          y: 802,
          size: 10,
          font: helvetica,
          color: rgb(0.8, 0.85, 0.95)
        });

        // Section Heading
        page.drawText(pageData.heading, {
          x: 40,
          y: 705,
          size: 14,
          font: helveticaBold,
          color: rgb(0.12, 0.16, 0.25)
        });

        // Subheading
        page.drawText(pageData.subheading, {
          x: 40,
          y: 685,
          size: 11,
          font: helveticaOblique,
          color: rgb(0.4, 0.45, 0.55)
        });

        // Horizontal Rule
        page.drawLine({
          start: { x: 40, y: 672 },
          end: { x: 555, y: 672 },
          thickness: 1,
          color: rgb(0.85, 0.88, 0.93)
        });

        // Bullet Points
        let yPos = 640;
        for (const bullet of pageData.bullets) {
          // Bullet point dot
          page.drawCircle({
            x: 48,
            y: yPos + 3,
            size: 3,
            color: rgb(0.24, 0.42, 0.96)
          });

          // Text wrap approx (splitting if needed or simple line)
          const words = bullet.split(' ');
          let line1 = '';
          let line2 = '';
          for (const word of words) {
            if ((line1 + word).length < 72 && line2 === '') {
              line1 += (line1 ? ' ' : '') + word;
            } else {
              line2 += (line2 ? ' ' : '') + word;
            }
          }

          page.drawText(line1, {
            x: 60,
            y: yPos,
            size: 10.5,
            font: helvetica,
            color: rgb(0.18, 0.22, 0.3)
          });

          if (line2) {
            yPos -= 16;
            page.drawText(line2, {
              x: 60,
              y: yPos,
              size: 10.5,
              font: helvetica,
              color: rgb(0.18, 0.22, 0.3)
            });
          }

          yPos -= 28;
        }

        // Callout / Quote Box
        if (pageData.quote) {
          page.drawRectangle({
            x: 40,
            y: yPos - 35,
            width: 515,
            height: 45,
            color: rgb(0.94, 0.96, 1.0),
            borderColor: rgb(0.65, 0.78, 0.98),
            borderWidth: 1
          });

          page.drawText(`Note: ${pageData.quote}`, {
            x: 52,
            y: yPos - 18,
            size: 10,
            font: helveticaOblique,
            color: rgb(0.15, 0.3, 0.7)
          });
        }

        // Footer
        page.drawLine({
          start: { x: 40, y: 50 },
          end: { x: 555, y: 50 },
          thickness: 0.5,
          color: rgb(0.85, 0.88, 0.93)
        });

        page.drawText('PDF Notes Workspace • Auto-indexed from local /pdf directory', {
          x: 40,
          y: 35,
          size: 8.5,
          font: helvetica,
          color: rgb(0.6, 0.65, 0.75)
        });

        page.drawText(new Date().toLocaleDateString(), {
          x: 500,
          y: 35,
          size: 8.5,
          font: helvetica,
          color: rgb(0.6, 0.65, 0.75)
        });
      }

      const pdfBytes = await pdfDoc.save();
      fs.writeFileSync(filePath, pdfBytes);
      console.log(`Generated: ${item.fileName}`);
    }

    initialMetadata[item.fileName] = {
      title: item.title,
      subject: item.subject,
      tags: item.tags,
      isFavorite: item.fileName.includes('Data_Structures'),
      lastReadPage: 1,
      userNotes: `Key concepts for ${item.subject} review.`
    };
  }

  const metaPath = path.join(__dirname, '..', 'notes-metadata.json');
  if (!fs.existsSync(metaPath)) {
    fs.writeFileSync(metaPath, JSON.stringify(initialMetadata, null, 2));
    console.log('Created notes-metadata.json');
  }
}

generateSamplePDFs().catch(console.error);
