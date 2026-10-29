import { useEffect, useRef, useState } from 'react';


interface ApiDataState< T > {
  key: string;
  data: T | null;
  loading: boolean;
  error: string | null;
}
