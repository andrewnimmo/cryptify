import React from "react";
import "./App.css";
import headerLogo from "./resources/cryptify-dark.svg";

import InfoPanel from "./InfoPanel";
import EncryptPanel from "./EncryptPanel";
import DecryptPanel from "./DecryptPanel";
import Lang from "./Lang";
import getTranslation from "./Translations";

type AppState = {
  lang: Lang;
};

type AppProps = {
  downloadUuid: string | null;
};

const langKey = "cryptify-language";

class App extends React.Component<AppProps, AppState> {
  constructor(props: AppProps) {
    super(props);
    this.state = {
      lang: this.getLangSetting(),
    };
  }

  getLangSetting(): Lang {
    let currentLang = localStorage.getItem(langKey);
    if (
      currentLang === null ||
      (currentLang !== (Lang.EN as string) &&
        currentLang !== (Lang.NL as string))
    ) {
      const userLang = navigator.language;
      currentLang = Lang.EN as string;
      if (userLang === "nl-NL") {
        currentLang = Lang.NL as string;
      }
      localStorage.setItem(langKey, currentLang);
    }
    return currentLang as Lang;
  }

  setLang(lang: Lang): void {
    localStorage.setItem(langKey, lang as string);

    this.setState({
      lang: lang,
    });
  }

  contentPanel() {
    if (this.props.downloadUuid) {
      return (
        <DecryptPanel
          lang={this.state.lang}
          downloadUuid={this.props.downloadUuid}
        />
      );
    } else {
      return <EncryptPanel lang={this.state.lang} />;
    }
  }

  render() {
    let panelClass = "";
    // @ts-ignore
    if (this.props.downloadUuid) {
      panelClass = "decrypt-panel";
    } else {
      panelClass = "encrypt-panel";
    }

    return (
      <div className="App">
        <div className={`content-panel ${panelClass}`}>
          <div className="crypt-panel-header">
            <div className="crypt-file-box-large-text">
              {getTranslation(this.state.lang).cryptFileInput_dropFiles}
            </div>
            <div className="crypt-file-box-small-text">
              {getTranslation(this.state.lang).cryptFileInput_clickFiles}
            </div>
            <div className="crypt-file-box-tiny-text">
              {getTranslation(this.state.lang).cryptFileInput_sendUpto}
            </div>
          </div>
          {this.contentPanel()}
        </div>
        {/*
        <InfoPanel
          lang={this.state.lang}
          onSetLang={(l: Lang) => this.setLang(l)}
        />
        */}
      </div>
    );
  }
}

export default App;
