declare module 'jsmediatags' {
  interface Tag {
    tags: {
      title?: string;
      artist?: string;
      album?: string;
      year?: string;
      genre?: string;
      picture?: {
        format: string;
        data: number[];
      };
    };
  }

  interface Callbacks {
    onSuccess: (tag: Tag) => void;
    onError: (error: Error) => void;
  }

  function read(source: Blob | string | ArrayBuffer, callbacks: Callbacks): void;

  export default { read };
}
