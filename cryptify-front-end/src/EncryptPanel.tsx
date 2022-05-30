import "./EncryptPanel.css";
import "web-streams-polyfill";
import React from "react";
import CryptFileInput from "./CryptFileInput";
import CryptFileList from "./CryptFileList";
import { Writer } from "@transcend-io/conflux";
import checkmark from "./resources/checkmark.svg";
import { createFileReadable, getFileStoreStream } from "./FileProvider";
import Lang from "./Lang";
import getTranslation from "./Translations";
import {
  MAX_UPLOAD_SIZE,
  UPLOAD_CHUNK_SIZE,
  PKG_URL,
  SMOOTH_TIME,
} from "./Constants";
import Chunker from "./utils";
import { withTransform } from "./utils";

enum EncryptionState {
  FileSelection = 1,
  Encrypting,
  Done,
  Error,
}

type EncryptState = {
  recipient: string;
  sender: string;
  message: string;
  files: File[];
  percentages: number[];
  done: boolean[];
  encryptionState: EncryptionState;
  abort: AbortController;
  selfAborted: boolean;
  encryptStartTime: number;
  modPromise: Promise<any>;
};

type EncryptProps = {
  lang: Lang;
};

const defaultEncryptState: EncryptState = {
  recipient: "",
  sender: "",
  message: "",
  files: [],
  percentages: [],
  done: [],
  encryptionState: EncryptionState.FileSelection,
  abort: new AbortController(),
  selfAborted: false,
  encryptStartTime: 0,
  modPromise: import("@e4a/irmaseal-wasm-bindings/") ,
};

export default class EncryptPanel extends React.Component<
  EncryptProps,
  EncryptState
> {
  constructor(props: EncryptProps) {
    super(props);
    this.state = defaultEncryptState;
  }

  onFile(files: FileList) {
    const fileArr = Array.from(files);

    this.setState({
      recipient: this.state.recipient,
      sender: this.state.sender,
      message: this.state.message,
      files: this.state.files.concat(fileArr),
      percentages: this.state.percentages.concat(fileArr.map((_) => 0)),
      done: this.state.done.concat(fileArr.map((_) => false)),
      encryptionState: this.state.encryptionState,
      abort: this.state.abort,
      selfAborted: this.state.selfAborted,
      encryptStartTime: this.state.encryptStartTime,
    });
  }

  onRemoveFile(index: number) {
    this.setState({
      recipient: this.state.recipient,
      sender: this.state.sender,
      message: this.state.message,
      files: this.state.files.filter((_, i) => i !== index),
      percentages: this.state.percentages.filter((_, i) => i !== index),
      done: this.state.done.filter((_, i) => i !== index),
      encryptionState: this.state.encryptionState,
      abort: this.state.abort,
      selfAborted: this.state.selfAborted,
      encryptStartTime: this.state.encryptStartTime,
    });
  }

  onChangeRecipient(ev: React.ChangeEvent<HTMLInputElement>) {
    this.setState({
      recipient: ev.target.value.toLowerCase(),
      sender: this.state.sender,
      message: this.state.message,
      files: this.state.files,
      percentages: this.state.percentages,
      done: this.state.done,
      encryptionState: this.state.encryptionState,
      abort: this.state.abort,
      selfAborted: this.state.selfAborted,
      encryptStartTime: this.state.encryptStartTime,
    });
  }

  onChangeSender(ev: React.ChangeEvent<HTMLInputElement>) {
    this.setState({
      recipient: this.state.recipient,
      sender: ev.target.value.toLowerCase(),
      message: this.state.message,
      files: this.state.files,
      percentages: this.state.percentages,
      done: this.state.done,
      encryptionState: this.state.encryptionState,
      abort: this.state.abort,
      selfAborted: this.state.selfAborted,
      encryptStartTime: this.state.encryptStartTime,
    });
  }

  onChangeMobileNumber(ev: React.ChangeEvent<HTMLInputElement>) {
    this.setState({
      recipient: this.state.recipient,
      sender: this.state.sender,
      message: this.state.message,
      files: this.state.files,
      percentages: this.state.percentages,
      done: this.state.done,
      encryptionState: this.state.encryptionState,
      abort: this.state.abort,
      selfAborted: this.state.selfAborted,
      encryptStartTime: this.state.encryptStartTime,
    });
  }

  onChangeMessage(ev: React.ChangeEvent<HTMLTextAreaElement>) {
    this.setState({
      recipient: this.state.recipient,
      sender: this.state.sender,
      message: ev.target.value,
      files: this.state.files,
      percentages: this.state.percentages,
      done: this.state.done,
      encryptionState: this.state.encryptionState,
      abort: this.state.abort,
      selfAborted: this.state.selfAborted,
      encryptStartTime: this.state.encryptStartTime,
    });
  }

  reportProgress(resolve: () => void, uploaded: number, done: boolean) {
    let offset = 0;
    let percentages = this.state.percentages.map((p) => p);
    let timeouts: number[] | undefined[] = this.state.percentages.map(
      (_) => undefined
    );

    this.state.files.forEach((f, i) => {
      const startFile = offset;
      const endFile = offset + f.size;
      if (uploaded < startFile) {
        percentages[i] = 0;
      } else if (uploaded >= endFile) {
        // We update to done after some time
        // To allow smoothing of progress.
        if (timeouts[i] === undefined) {
          timeouts[i] = window.setTimeout(() => {
            const dones = this.state.done.map((d) => d);
            dones[i] = true;
            this.setState({
              recipient: this.state.recipient,
              sender: this.state.sender,
              message: this.state.message,
              files: this.state.files,
              percentages: this.state.percentages,
              done: dones,
              encryptionState: this.state.encryptionState,
              abort: this.state.abort,
              selfAborted: this.state.selfAborted,
              encryptStartTime: this.state.encryptStartTime,
            });
          }, 1000 * SMOOTH_TIME);
        }
        percentages[i] = 100;
      } else {
        const uploadedOfFile = (uploaded - startFile) / f.size;
        percentages[i] = Math.round(100 * uploadedOfFile);
      }

      offset = endFile;
    });

    this.setState({
      recipient: this.state.recipient,
      sender: this.state.sender,
      message: this.state.message,
      files: this.state.files,
      percentages: percentages,
      done: this.state.done,
      encryptionState: this.state.encryptionState,
      abort: this.state.abort,
      selfAborted: this.state.selfAborted,
      encryptStartTime: this.state.encryptStartTime,
    });

    if (done) {
      window.setTimeout(() => resolve(), 1000 * SMOOTH_TIME);
    }
  }

  async applyEncryption() {
    if (!this.canEncrypt()) {
      return;
    }

    const resp = await fetch(`${PKG_URL}/v2/parameters`);

    const params = JSON.parse(await resp.text());
    const pk = params.publicKey;

    const mod = await this.state.modPromise;
    const ts = Math.round(Date.now() / 1000);

    const policies = {
      [this.state.recipient]: {
        ts,
        con: [{ t: "pbdf.sidn-pbdf.email.email", v: this.state.recipient }],
      },
    };

    // @ts-ignore
    const uploadChunker = new Chunker(
      undefined,
      UPLOAD_CHUNK_SIZE
    ) as TransformStream;

    // Create streams that takes all input files and zips them into
    // an output stream.
    const zipTf = new Writer();
    const readable = zipTf.readable as ReadableStream;
    const writeable = zipTf.writable;

    const writer = writeable.getWriter();

    this.state.files.forEach((f, i) => {
      const s = createFileReadable(f);

      writer.write({
        name: f.name,
        lastModified: f.lastModified,
        stream: () => s,
      });
    });

    writer.close();

    // This is not 100% accurate due to zip and irmaseal
    // header but it's close enough for the UI.
    const finished = new Promise<void>(async (resolve, reject) => {
      const fileStream = getFileStoreStream(
        this.state.abort,
        this.state.sender,
        this.state.recipient,
        this.state.message,
        this.props.lang,
        (n, last) => this.reportProgress(resolve, n, last)
      ) as WritableStream;

      mod.seal(
        pk,
        policies,
        readable,
        withTransform(fileStream, uploadChunker, this.state.abort.signal)
      );
    });

    await finished;
  }

  async onEncrypt() {
    // TODO: Simplify this error handling logic.
    // For some reason stream errors are not caught
    // Which means when the user aborts
    // exceptions spill into the console...
    this.setState({
      recipient: this.state.recipient,
      sender: this.state.sender,
      message: this.state.message,
      files: this.state.files,
      percentages: this.state.percentages,
      done: this.state.done,
      encryptionState: EncryptionState.Encrypting,
      abort: this.state.abort,
      selfAborted: false,
      encryptStartTime: Date.now(),
    });

    try {
      await this.applyEncryption();
      this.setState({
        recipient: this.state.recipient,
        sender: this.state.sender,
        message: this.state.message,
        files: this.state.files,
        percentages: this.state.percentages,
        done: this.state.done,
        encryptionState: EncryptionState.Done,
        abort: this.state.abort,
        selfAborted: false,
        encryptStartTime: 0,
      });
    } catch (e) {
      if (this.state.selfAborted === false) {
        console.error("Error occured during encryption");
        console.error(e);
        this.setState({
          recipient: this.state.recipient,
          sender: this.state.sender,
          message: this.state.message,
          files: this.state.files,
          percentages: this.state.percentages,
          done: this.state.done,
          encryptionState: EncryptionState.Error,
          abort: this.state.abort,
          selfAborted: false,
          encryptStartTime: 0,
        });
      } else {
        this.setState({
          recipient: this.state.recipient,
          sender: this.state.sender,
          message: this.state.message,
          files: this.state.files,
          percentages: this.state.percentages.map((_) => 0),
          done: this.state.percentages.map((_) => false),
          encryptionState: EncryptionState.FileSelection,
          abort: this.state.abort,
          selfAborted: false,
          encryptStartTime: 0,
        });
      }
    }
  }

  onCancel(ev: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    this.state.abort.abort();
    this.setState({
      recipient: this.state.recipient,
      sender: this.state.sender,
      message: this.state.message,
      files: this.state.files,
      percentages: this.state.percentages.map((_) => 0),
      done: this.state.percentages.map((_) => false),
      encryptionState: EncryptionState.FileSelection,
      abort: new AbortController(),
      selfAborted: false,
      encryptStartTime: 0,
    });
  }

  onAnother(ev: React.MouseEvent<HTMLButtonElement, MouseEvent>) {
    this.setState(defaultEncryptState);
  }

  canEncrypt() {
    const totalSize = this.state.files
      .map((f) => f.size)
      .reduce((a, b) => a + b, 0);

    return (
      totalSize < MAX_UPLOAD_SIZE &&
      this.state.recipient.length > 0 &&
      this.state.sender.length > 0 &&
      this.state.files.length > 0
    );
  }

  renderfilesField() {
    if (this.state.files.length === 0) {
      return (
        <div className="crypt-file-upload-box">
          <CryptFileInput
            lang={this.props.lang}
            onFile={(f) => this.onFile(f)}
            multiple={true}
            required={true}
          />
        </div>
      );
    } else {
      return (
        <div>
          <CryptFileList
            lang={this.props.lang}
            onAddFiles={
              this.state.encryptionState === EncryptionState.FileSelection
                ? (f: FileList) => this.onFile(f)
                : null
            }
            onRemoveFile={
              this.state.encryptionState === EncryptionState.FileSelection
                ? (i) => this.onRemoveFile(i)
                : null
            }
            files={this.state.files}
            forUpload={true}
            percentages={this.state.percentages}
            done={this.state.done}
          ></CryptFileList>
        </div>
      );
    }
  }

  renderUserInputs() {
    return (
      <div className="crypt-progress-container">
        <div className="crypt-select-protection-input-box">
          <h4>{getTranslation(this.props.lang).encryptPanel_emailRecipient}</h4>
          <input
            placeholder=""
            type="text"
            required={true}
            value={this.state.recipient}
            onChange={(e) => this.onChangeRecipient(e)}
          />
        </div>
        <div className="crypt-select-protection-input-box">
          <h4>{getTranslation(this.props.lang).encryptPanel_emailSender}</h4>
          <input
            placeholder=""
            type="text"
            required={true}
            value={this.state.sender}
            onChange={(e) => this.onChangeSender(e)}
          />
        </div>
        <div className="crypt-select-protection-input-box">
          <h4>{getTranslation(this.props.lang).encryptPanel_message}</h4>
          <textarea
            required={false}
            rows={4}
            value={this.state.message}
            onChange={(e) => this.onChangeMessage(e)}
          />
        </div>
        <button
          className={
            "crypt-btn-main crypt-btn" +
            (this.canEncrypt() ? "" : " crypt-btn-disabled")
          }
          onClick={(e) => {
            if (this.canEncrypt()) {
              this.onEncrypt();
            }
          }}
        >
          {getTranslation(this.props.lang).encryptPanel_encryptSend}
        </button>
      </div>
    );
  }

  renderProgress() {
    const deltaT = Date.now() - this.state.encryptStartTime;
    const totalSize = this.state.files
      .map((f) => f.size)
      .reduce((a, b) => a + b, 0);

    const totalProgress = this.state.files
      .map((f, i) => (this.state.percentages[i] * f.size) / totalSize)
      .reduce((a, b) => a + b, 0);

    let timeEstimateRepr = getTranslation(this.props.lang).estimate;
    if (deltaT > 1000 && totalProgress > 1) {
      const remainingProgress = 100 - totalProgress;
      const estimatedT = remainingProgress * (deltaT / totalProgress);
      timeEstimateRepr = getTranslation(this.props.lang).timeremaining(
        estimatedT
      );
    }

    return (
      <div className="crypt-progress-container">
        <h3>{getTranslation(this.props.lang).encryptPanel_encrypting}</h3>
        <p>
          {getTranslation(this.props.lang).encryptPanel_encryptingInfo}
          <a href={`mailto:${this.state.recipient}`}>{this.state.recipient}</a>
        </p>
        <p>{timeEstimateRepr}</p>

        <button
          className={"crypt-btn crypt-btn-secondary crypt-btn-cancel"}
          onClick={(e) => this.onCancel(e)}
          type="button"
        >
          {getTranslation(this.props.lang).cancel}
        </button>
      </div>
    );
  }

  renderDone() {
    return (
      <div className="crypt-progress-container">
        <h3>
          <img
            className="checkmark-icon"
            src={checkmark}
            alt="checkmark-icon"
            style={{ height: "0.85em" }}
          />
          {getTranslation(this.props.lang).encryptPanel_succes}
        </h3>
        <p>
          <span>{getTranslation(this.props.lang).encryptPanel_succesInfo}</span>
          <a href={`mailto:${this.state.recipient}`}>{this.state.recipient}</a>
        </p>
        <button
          className={"crypt-btn-main crypt-btn"}
          onClick={(e) => this.onAnother(e)}
          type="button"
        >
          {getTranslation(this.props.lang).encryptPanel_another}
        </button>
      </div>
    );
  }

  renderError() {
    return (
      <div className="crypt-progress-container">
        <h3 className="crypt-progress-error">{"Error occured"}</h3>
        <p>{getTranslation(this.props.lang).error}</p>
        <button
          className={"crypt-btn-main crypt-btn"}
          onClick={(e) => this.onEncrypt()}
          type="button"
        >
          {getTranslation(this.props.lang).tryAgain}
        </button>
      </div>
    );
  }

  render() {
    if (this.state.encryptionState === EncryptionState.FileSelection) {
      return (
        <form
          onSubmit={(e) => {
            // preven submit redirection
            e.preventDefault();
            return false;
          }}
        >
          {this.renderfilesField()}
          {this.renderUserInputs()}
        </form>
      );
    } else if (this.state.encryptionState === EncryptionState.Encrypting) {
      return (
        <form>
          {this.renderfilesField()}
          {this.renderProgress()}
        </form>
      );
    } else if (this.state.encryptionState === EncryptionState.Error) {
      return (
        <form>
          {this.renderfilesField()}
          {this.renderError()}
        </form>
      );
    } else if (this.state.encryptionState === EncryptionState.Done) {
      return (
        <form>
          {this.renderfilesField()}
          {this.renderDone()}
        </form>
      );
    }
  }
}
