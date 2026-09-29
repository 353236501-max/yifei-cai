export type PdfExercise={id:string;title:string;question:string;hint:string;solution:string};
export type PdfNote={
 id:string;topics:string[];title:string;source:string;documentId:string;
 pages:number[];sourceDetail?:string;content:string;exercises:PdfExercise[];
};
