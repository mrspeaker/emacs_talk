const levelParser = txt => {
  return txt.split("\ndone").map(levelParse);
};

const levelParse = txt => {
  const lines = txt.split("\n").filter(n => !!n);

  const parsed = lines.reduce(
    (ac, line) => {
      line = line.trim();

      const header = line.match(/\*.*/);
      if (header) {
        return ac;
      }

      const gridBoundary = line.match(/\+-+\+/);
      if (gridBoundary) {
        if (ac.started) {
          ac.h = ac.y;
          ac.lines = ac.levelLines.join("");
          delete ac.levelLines;
          delete ac.started;
          delete ac.y;
        } else {
          ac.started = true;
          ac.w = gridBoundary[0].length - 2;
          ac.y = 0;
        }
        return ac;
      }

      const levelLine = line.match(/\|.*\|/);
      if (levelLine) {
        if (!ac.started) {
          throw new Error("Not started");
        }
        ac.y++;
        ac.levelLines.push(levelLine[0].slice(1, -1));
        return ac;
      }

      const param = line.match(/([a-zA-Z0-9]*).*:(.*)/);
      if (param) {
        let [input, key, value] = param.map(p => p.trim());
        let type = "slide";
        let data;
        if (value.includes(".png")) {
          type = "res";
          let datas = value.split(" ");
          if (datas.length > 1) {
            value = datas[0];
            data = datas.slice(1);
          }
        }
        ac.params[key] = { value, type, data }; //.push({ key, value });
      }
      return ac;
    },
    { w: 0, h: 0, levelLines: [], params: {}, res: [] }
  );
  return parsed;
};

export default levelParser;
