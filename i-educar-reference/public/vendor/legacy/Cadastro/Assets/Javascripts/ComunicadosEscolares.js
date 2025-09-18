$j(document).ready(function () {
  initSummernote('descricao');
  function initSummernote(sElement) {

    const element = $j(`#${sElement}`);
    let value = element.val();

    const settings = {
      height: 146,                 // set editor height
      minHeight: null,             // set minimum height of editor
      maxHeight: null,             // set maximum height of editor
      focus: false,                 // set focus to editable area after initializing summernote
      lang: 'pt-BR',
      toolbar: [
        ['style', ['bold', 'italic', 'underline', 'clear']],
        ['para', ['ul', 'ol']],
        ['insert', ['link']],
      ],
      fontNames: ['Arial'],
      callbacks: {
        onBlur: function(contents) {

          const elementToFind = contents.relatedTarget;
          const attrClass = $j(elementToFind).attr('class');

          if(!attrClass || !attrClass.include('note-btn')) {

            const currentlyValue = element.val();

            if (value != currentlyValue) {

              if (currentlyValue.replace(/<\/?[^>]+(>|$)/g, "") === '') {

                element.val(currentlyValue.replace(/<\/?[^>]+(>|$)/g, ""));

                value = currentlyValue.replace(/<\/?[^>]+(>|$)/g, "");

              } else {

                value = currentlyValue;
              }

              changeParecer($j(this));

            }
          }
        },
        onPaste : function (event) {
          event.preventDefault();
          let text = null;
          if (window.clipboardData){
            text = window.clipboardData.getData("Text");

          } else if (event.originalEvent && event.originalEvent.clipboardData){
            text = event.originalEvent.clipboardData.getData("Text");
          }

          element.summernote('insertText', text);

          element.val(text);
        }
      }
    };
    element.summernote(settings);
  }
});
